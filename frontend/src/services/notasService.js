import apiClient from "./apiClient";

export async function listNotas(params) {
  const { data } = await apiClient.get("/notas/", { params });
  return data;
}
export async function createNota(payload) {
  const { data } = await apiClient.post("/notas/", payload);
  return data;
}
export async function updateNota(id, payload) {
  const { data } = await apiClient.patch(`/notas/${id}/`, payload);
  return data;
}
export async function deleteNota(id) {
  await apiClient.delete(`/notas/${id}/`);
}
