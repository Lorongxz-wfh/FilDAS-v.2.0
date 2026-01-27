import api from "./api";

export type TempPreview = {
  id: string;
  year: number;
  url: string;
};

export async function createTempPreview(file: File): Promise<TempPreview> {
  const form = new FormData();
  form.append("file", file);

  // IMPORTANT: do NOT manually set Content-Type for FormData;
  // axios will set multipart boundary correctly.
  const res = await api.post("/previews", form);

  return res.data as TempPreview;
}

export async function deleteTempPreview(year: number, id: string): Promise<void> {
  await api.delete(`/previews/${year}/${id}`);
}
