# csv-reader-speed-01-run-20261121-entry

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/rezimtirani/csv-reader-speed-01-run-20261121-entry/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/rezimtirani/csv-reader-speed-01-run-20261121-entry/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A fast drop-in for csv-reader 1.0.0: it answers exactly as csv-reader does on every broken CSV — stray CRs, unterminated quotes, quote junk, short and long rows — but reads each file with slice and indexOf jumps instead of one character at a time.

## Run it

```sh
node main.ts
```

`main.ts` reads every case from `/input/cases.json` (or `$MAKEFUN_INPUT_DIR/cases.json`) and writes the answers to `/output/answers.json` (or `$MAKEFUN_OUTPUT_DIR/answers.json`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=mxxxb8b6&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
