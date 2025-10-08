import apiClient from "./apiClient";

export async function listInscripciones(params) {
  const { data } = await apiClient.get("/inscripciones/", { params });
  return data;
}
export async function createInscripcion(payload) {
  try {
    const { data } = await apiClient.post("/inscripciones/", payload);
    return data;
  } catch (err) {
    // 👇 Te dirá exactamente qué campo/no formato rechaza DRF
    console.error("POST /inscripciones/ payload:", payload);
    if (err.response) {
      console.error("POST /inscripciones/ error:", err.response.status, err.response.data);
      throw err.response.data; // propaga mensajes del backend
    }
    throw err;
  }
}
export async function updateInscripcion(id, payload) {
  const { data } = await apiClient.patch(`/inscripciones/${id}/`, payload);
  return data;
}
export async function deleteInscripcion(id) {
  await apiClient.delete(`/inscripciones/${id}/`);
}
