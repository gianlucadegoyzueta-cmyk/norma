import { describe, expect, it } from "vitest";
import {
  type DnsResolver,
  type FetchLike,
  ICalHttpFetcher,
  isBlockedAddress,
} from "../adapters/ICalHttpFetcher";
import { ICalFetchError } from "../ports";

// Fixture iCal minima e ANONIMA (nessun PII reale).
const VALID_ICS = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "UID:anon@example",
  "DTSTART;VALUE=DATE:20260601",
  "DTEND;VALUE=DATE:20260603",
  "SUMMARY:Reserved",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

/** Risolutore DNS finto: ogni host risolve a un IP pubblico (203.0.113.10, TEST-NET-3). */
const publicResolver: DnsResolver = async () => ["203.0.113.10"];

/** Costruisce una Response 200 con un corpo testuale (stream reale via Response). */
function okResponse(body: string): Response {
  return new Response(body, { status: 200, headers: { "content-type": "text/calendar" } });
}

/** Costruisce una Response di redirect verso `location`. */
function redirectResponse(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } });
}

describe("isBlockedAddress (SSRF allowlist)", () => {
  it("blocca loopback, privati, link-local, metadata cloud, CGNAT", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.5",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254", // metadata AWS/GCP
      "100.64.0.1", // CGNAT
      "0.0.0.0",
      "224.0.0.1", // multicast
      "::1", // loopback v6
      "fe80::1", // link-local v6
      "fd00::1", // unique-local v6
      "::ffff:127.0.0.1", // IPv4-mapped loopback
    ]) {
      expect(isBlockedAddress(ip), `${ip} dovrebbe essere bloccato`).toBe(true);
    }
  });

  it("consente gli IP pubblici", () => {
    for (const ip of ["8.8.8.8", "203.0.113.10", "1.1.1.1", "2606:4700:4700::1111"]) {
      expect(isBlockedAddress(ip), `${ip} dovrebbe essere consentito`).toBe(false);
    }
  });

  it("blocca input non-IP", () => {
    expect(isBlockedAddress("non-un-ip")).toBe(true);
    expect(isBlockedAddress("")).toBe(true);
  });
});

describe("ICalHttpFetcher — SSRF", () => {
  it("rifiuta un host che risolve a un IP privato (anche se l'URL sembra innocuo)", async () => {
    const fetchImpl: FetchLike = async () => okResponse(VALID_ICS);
    const resolver: DnsResolver = async () => ["10.0.0.5"]; // host interno
    const fetcher = new ICalHttpFetcher({ fetchImpl, resolver });
    await expect(fetcher.fetch("https://evil.example/cal.ics")).rejects.toThrow(ICalFetchError);
  });

  it("rifiuta un IP letterale di loopback senza nemmeno chiamare la rete", async () => {
    let called = false;
    const fetchImpl: FetchLike = async () => {
      called = true;
      return okResponse(VALID_ICS);
    };
    const fetcher = new ICalHttpFetcher({ fetchImpl, resolver: publicResolver });
    await expect(fetcher.fetch("http://127.0.0.1/cal.ics")).rejects.toThrow(ICalFetchError);
    expect(called).toBe(false);
  });

  it("rifiuta il metadata endpoint 169.254.169.254", async () => {
    const fetchImpl: FetchLike = async () => okResponse(VALID_ICS);
    const fetcher = new ICalHttpFetcher({ fetchImpl, resolver: publicResolver });
    await expect(fetcher.fetch("http://169.254.169.254/latest/meta-data/")).rejects.toThrow(
      ICalFetchError,
    );
  });

  it("rifiuta un redirect che punta a un IP interno (SSRF via redirect)", async () => {
    const fetchImpl: FetchLike = async (url) => {
      if (url.includes("start")) return redirectResponse("https://internal.example/cal.ics");
      return okResponse(VALID_ICS);
    };
    // start.example pubblico, internal.example interno.
    const resolver: DnsResolver = async (host) =>
      host === "internal.example" ? ["192.168.1.10"] : ["203.0.113.10"];
    const fetcher = new ICalHttpFetcher({ fetchImpl, resolver });
    await expect(fetcher.fetch("https://start.example/cal.ics")).rejects.toThrow(ICalFetchError);
  });
});

describe("ICalHttpFetcher — MITM / downgrade (C1)", () => {
  it("rifiuta un redirect https→http (downgrade di trasporto)", async () => {
    const fetchImpl: FetchLike = async (url) => {
      if (url.startsWith("https://")) return redirectResponse("http://feed.example/cal.ics");
      return okResponse(VALID_ICS);
    };
    const fetcher = new ICalHttpFetcher({ fetchImpl, resolver: publicResolver });
    await expect(fetcher.fetch("https://feed.example/cal.ics")).rejects.toThrow(
      /connessione non sicura/i,
    );
  });

  it("consente un redirect http→https (upgrade) e segue fino al corpo", async () => {
    const fetchImpl: FetchLike = async (url) => {
      if (url.startsWith("http://")) return redirectResponse("https://feed.example/cal.ics");
      return okResponse(VALID_ICS);
    };
    const fetcher = new ICalHttpFetcher({ fetchImpl, resolver: publicResolver });
    await expect(fetcher.fetch("http://feed.example/cal.ics")).resolves.toContain(
      "BEGIN:VCALENDAR",
    );
  });

  it("consente i redirect https→https", async () => {
    const fetchImpl: FetchLike = async (url) => {
      if (url.includes("step1")) return redirectResponse("https://feed.example/step2.ics");
      return okResponse(VALID_ICS);
    };
    const fetcher = new ICalHttpFetcher({ fetchImpl, resolver: publicResolver });
    await expect(fetcher.fetch("https://feed.example/step1.ics")).resolves.toContain(
      "BEGIN:VCALENDAR",
    );
  });
});

describe("ICalHttpFetcher — redirect cap", () => {
  it("rifiuta una catena di redirect più lunga del limite", async () => {
    let n = 0;
    const fetchImpl: FetchLike = async () => {
      n += 1;
      return redirectResponse(`https://feed.example/r${n}.ics`);
    };
    const fetcher = new ICalHttpFetcher({ fetchImpl, resolver: publicResolver, maxRedirects: 3 });
    await expect(fetcher.fetch("https://feed.example/start.ics")).rejects.toThrow(
      /reindirizzamenti/i,
    );
  });

  it("rifiuta un redirect senza header Location", async () => {
    const fetchImpl: FetchLike = async () => new Response(null, { status: 302 });
    const fetcher = new ICalHttpFetcher({ fetchImpl, resolver: publicResolver });
    await expect(fetcher.fetch("https://feed.example/cal.ics")).rejects.toThrow(ICalFetchError);
  });
});

describe("ICalHttpFetcher — cap dimensione (anti-OOM)", () => {
  it("aborta se il corpo supera maxBytes (streaming)", async () => {
    // Stream che emette chunk all'infinito: senza cap il fetcher andrebbe OOM.
    const fetchImpl: FetchLike = async () => {
      const chunk = new TextEncoder().encode("BEGIN:VCALENDAR\r\n" + "X".repeat(1024));
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(chunk);
        },
      });
      return new Response(stream, { status: 200 });
    };
    const fetcher = new ICalHttpFetcher({
      fetchImpl,
      resolver: publicResolver,
      maxBytes: 4096,
    });
    await expect(fetcher.fetch("https://feed.example/huge.ics")).rejects.toThrow(/troppo grande/i);
  });

  it("accetta un corpo entro il limite", async () => {
    const fetchImpl: FetchLike = async () => okResponse(VALID_ICS);
    const fetcher = new ICalHttpFetcher({ fetchImpl, resolver: publicResolver, maxBytes: 1_000 });
    await expect(fetcher.fetch("https://feed.example/cal.ics")).resolves.toContain(
      "BEGIN:VCALENDAR",
    );
  });
});

describe("ICalHttpFetcher — validazione protocollo e contenuto", () => {
  it("rifiuta schemi non http(s)", async () => {
    const fetchImpl: FetchLike = async () => okResponse(VALID_ICS);
    const fetcher = new ICalHttpFetcher({ fetchImpl, resolver: publicResolver });
    await expect(fetcher.fetch("file:///etc/passwd")).rejects.toThrow(ICalFetchError);
    await expect(fetcher.fetch("ftp://feed.example/cal.ics")).rejects.toThrow(ICalFetchError);
  });

  it("rifiuta un corpo senza BEGIN:VCALENDAR", async () => {
    const fetchImpl: FetchLike = async () => okResponse("<html>non sono un calendario</html>");
    const fetcher = new ICalHttpFetcher({ fetchImpl, resolver: publicResolver });
    await expect(fetcher.fetch("https://feed.example/cal.ics")).rejects.toThrow(/BEGIN:VCALENDAR/i);
  });

  it("propaga gli errori HTTP non-ok", async () => {
    const fetchImpl: FetchLike = async () => new Response("nope", { status: 404 });
    const fetcher = new ICalHttpFetcher({ fetchImpl, resolver: publicResolver });
    await expect(fetcher.fetch("https://feed.example/cal.ics")).rejects.toThrow(/HTTP 404/);
  });

  it("traduce l'AbortError di timeout in un messaggio gentile", async () => {
    const fetchImpl: FetchLike = async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    };
    const fetcher = new ICalHttpFetcher({ fetchImpl, resolver: publicResolver });
    await expect(fetcher.fetch("https://feed.example/cal.ics")).rejects.toThrow(/non ha risposto/i);
  });
});
