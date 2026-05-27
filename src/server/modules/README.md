# Moduli di dominio

Ogni cartella qui dentro è un **modulo** che incapsula la logica di un'area del dominio
(servizi, regole di business, accesso ai dati via Prisma). La UI (`src/app`) e le route API
chiamano questi moduli, mai il contrario.

Convenzione suggerita per ogni modulo:
- `*.service.ts` — logica e orchestrazione
- `*.repository.ts` — query Prisma (quando conviene isolarle)
- `*.types.ts` — tipi del modulo

Moduli previsti: `organizations`, `alloggiati`, `properties`, `stays`, `tourist-tax`.
In questa fase è presente solo lo scheletro: nessuna funzionalità è ancora implementata.
