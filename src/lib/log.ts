const start = performance.now();

export function log(tag: string, msg: string, data?: Record<string, unknown>) {
  const elapsed = (performance.now() - start).toFixed(1);
  const fields = data
    ? Object.entries(data)
        .map(([k, v]) => {
          if (typeof v === "number") return `${k}=${v.toFixed(1)}`;
          return `${k}=${v}`;
        })
        .join(" ")
    : "";
  console.log(`[+${elapsed}ms][${tag}] ${msg}${fields ? ` {${fields}}` : ""}`);
}
