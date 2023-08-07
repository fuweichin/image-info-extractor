interface Metadata {
  content: ArrayBuffer,
  parsed: Record<string, any>
}
interface ImageInfo {
  width: number,
  height: number,
  bitDepth: number,
  alpha: boolean,
  animation: boolean,
  lossless: boolean,
  progressive: boolean,
  grid?: boolean,
  rotate?: number,
  mirror?: number,
  creationTime?: number,
  modificationTime?: number,
}
interface ImageInfoMetadata {
  parsed: ImageInfo
}
interface ReadResult {
  INFO: ImageInfoMetadata,
  EXIF?: Metadata,
  XMP?: Metadata,
  ICC?: Metadata,
  ExtendedXMP?: Metadata,
  IPTC?: Metadata,
  JFIF?: Metadata,
  JFXX?: Metadata
}

export declare function readFile(file:Blob):Promise<ReadResult>;
export declare function parseResult(result:ReadResult):Promise<ReadResult>;
export declare function isSupportedImageFile(file:File):boolean;
export declare function isSupportedSidecarFile(file:File):boolean;
