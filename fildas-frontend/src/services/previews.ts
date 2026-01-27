import api from "./api";

export type TempPreview = {
  id: string;
  year: number;
  url: string; // signed URL to iframe
};

export async function createTempPreview(file: File): Promise<TempPreview> {
  const form = new FormData();
  form.append("file", file);

  const res = await api.post("/previews", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data as TempPreview;
}

export async function deleteTempPreview(year: number, id: string): Promise<void> {
  await api.delete(`/previews/${year}/${id}`);
}
