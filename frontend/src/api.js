async function handle(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || `Request failed (${res.status})`);
  return body;
}
export const postJSON = (url, data) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(handle);
export const postForm = (url, fields) => {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  return fetch(url, { method: "POST", body: fd }).then(handle);
};
export const inr = (n) => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
