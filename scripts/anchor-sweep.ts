// Verify the detector output is stable across all 7 anchor weekdays
import { detectAnomalies } from "@/lib/detect";

const RealDate = Date;
for (let offset = 0; offset < 7; offset++) {
  const fake = new RealDate();
  fake.setUTCDate(fake.getUTCDate() + offset);
  const iso = fake.toISOString();
  // monkey-patch Date so getAccount() anchors to the fake day
  // @ts-expect-error test shim
  globalThis.Date = class extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(iso);
      // @ts-expect-error spread into parent
      else super(...args);
    }
    static now() { return new RealDate(iso).getTime(); }
  };
  // bust the module-level cache by re-importing fresh
  delete require.cache[require.resolve("@/lib/data/generate")];
  delete require.cache[require.resolve("@/lib/detect")];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { detectAnomalies: detect } = require("@/lib/detect");
  const anomalies = detect();
  const day = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new RealDate(iso).getUTCDay()];
  console.log(`${day} ${iso.slice(0,10)}: ${anomalies.length} anomalies — ${anomalies.map((a: {type:string}) => a.type).join(", ")}`);
  globalThis.Date = RealDate;
}
void detectAnomalies;
