declare module "dom-to-image-more" {
  function toPng(
    node: HTMLElement,
    options?: Record<string, any>,
  ): Promise<string>;
  function toJpeg(
    node: HTMLElement,
    options?: Record<string, any>,
  ): Promise<string>;
  function toBlob(
    node: HTMLElement,
    options?: Record<string, any>,
  ): Promise<Blob>;
  const domtoimage: {
    toPng: typeof toPng;
    toJpeg: typeof toJpeg;
    toBlob: typeof toBlob;
  };
  export default domtoimage;
  export { toPng, toJpeg, toBlob };
}
