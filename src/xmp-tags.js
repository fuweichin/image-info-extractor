/**
 * List of XMP tags (core, non-string)
 * found on https://exiftool.org/TagNames/XMP.html
 * Exif 2.3 metadata for XMP
 */
export const tagTypeMap = {
  // #region Dublin Core
  'dc:Date': 'Date[]',
  // #endregion

  // #region EXIF
  'exif:DateTimeOriginal': 'Date',
  'exif:ColorSpace': 'integer',
  'exif:ExposureTime': 'rational',
  'exif:FNumber': 'rational',
  'exif:ExposureProgram': 'integer',
  'exifEX:PhotographicSensitivity': 'integer',
  'exifEX:SensitivityType': 'integer',
  'exif:ISOSpeedRatings': 'integer',
  'exifEX:StandardOutputSensitivity': 'integer',
  'exifEX:ISOSpeed': 'integer',
  'exifEX:ISOSpeedLatitudeyyy': 'integer',
  'exifEX:ISOSpeedLatitudezzz': 'integer',
  'exif:ShutterSpeedValue': 'rational',
  'exif:ApertureValue': 'rational',
  'exif:BrightnessValue': 'rational',
  'exif:ExposureBiasValue': 'rational',
  'exif:MaxApertureValue': 'rational',
  'exif:SubjectDistance': 'rational',
  'exif:MeteringMode': 'integer',
  'exif:LightSource': 'integer',
  'exif:FocalLength': 'rational',
  'exif:SubjectArea': 'integer',
  'exif:FlashEnergy': 'rational',
  'exif:FocalPlaneXResolution': 'rational',
  'exif:FocalPlaneYResolution': 'rational',
  'exif:SubjectLocation': 'integer',
  'exif:ExposureIndex': 'rational',
  'exif:SensingMethod': 'integer',
  'exif:FileSource': 'integer',
  'exif:SceneType': 'integer',
  'exif:CustomRendered': 'integer',
  'exif:ExposureMode': 'integer',
  'exif:WhiteBalance': 'integer',
  'exif:DigitalZoomRatio': 'rational',
  'exif:FocalLengthIn35mmFilm': 'integer',
  'exif:SceneCaptureType': 'integer',
  'exif:GainControl': 'integer',
  'exif:Contrast': 'integer',
  'exif:Saturation': 'integer',
  'exif:Sharpness': 'integer',
  'exif:DeviceSettingDescription': 'integer',
  'exif:SubjectDistanceRange': 'integer',
  'exifEX:LensSpecification': 'rational[]',
  // GPS
  'exif:GPSLatitude': 'GPSCoordinate',
  'exif:GPSLongitude': 'GPSCoordinate',
  'exif:GPSAltitudeRef': 'integer',
  'exif:GPSAltitude': 'rational',
  'exif:GPSTimeStamp': 'Date',
  'exif:GPSMeasureMode': 'integer',
  'exif:GPSDOP': 'rational',
  'exif:GPSSpeed': 'rational',
  'exif:GPSTrack': 'rational',
  'exif:GPSImgDirection': 'rational',
  'exif:GPSDestLatitude': 'GPSCoordinate',
  'exif:GPSDestLongitude': 'GPSCoordinate',
  'exif:GPSDestBearing': 'rational',
  'exif:GPSDestDistance': 'rational',
  'exif:GPSDifferential': 'integer',
  'exifEX:GPSHPositioningError': 'rational',

  'exifEX:Gamma': 'rational',
  'exif:ComponentsConfiguration': 'integer',
  'exif:CompressedBitsPerPixel': 'rational',
  'exif:PixelXDimension': 'integer',
  'exif:PixelYDimension': 'integer',

  // Flash
  'exif:Columns': 'integer',
  'exif:Rows': 'integer',
  'exif:Fired': 'boolean',
  'exif:Function': 'boolean',
  'exif:Mode': 'integer',
  'exif:RedEyeMode': 'boolean',
  'exif:Return': 'integer',
  // #endregion

  // #region TIFF
  'tiff:ImageWidth': 'integer',
  'tiff:ImageLength': 'integer',
  'tiff:DateTime': 'Date',
  'tiff:ImageHeight': 'integer', // called ImageLength by the spec
  'tiff:BitsPerSample': 'integer',
  'tiff:Compression': 'integer',
  'tiff:PhotometricInterpretation': 'integer',
  'tiff:Orientation': 'integer',
  'tiff:SamplesPerPixel': 'integer',
  'tiff:PlanarConfiguration': 'integer',
  'tiff:YCbCrSubSampling': 'integer',
  'tiff:YCbCrPositioning': 'integer',
  'tiff:XResolution': 'rational',
  'tiff:YResolution': 'rational',
  'tiff:ResolutionUnit': 'integer',
  'tiff:TransferFunction': 'integer',
  'tiff:WhitePoint': 'rational[]',
  'tiff:PrimaryChromaticities': 'rational[]',
  'tiff:YCbCrCoefficients': 'rational[]',
  'tiff:ReferenceBlackWhite': 'rational[]',
  // #endregion

  // #region XMP
  'xmp:CreateDate': 'Date',
  'xmp:MetadataDate': 'Date',
  'xmp:ModifyDate': 'Date',
  'xmp:PageImageHeight': 'integer',
  'xmp:PageImagePageNumber': 'integer',
  'xmp:PageImageWidth': 'integer',
  'xmp:Rating': 'real',
  'xmp:RatingPercent': 'real[]',
  'xmp:ThumbnailHeight': 'integer',
  'xmp:ThumbnailWidth': 'integer',
  // PageInfo struct
  'xmp:PageNumber': 'integer',
  'xmp:Height': 'integer',
  'xmp:Width': 'integer',
  // #endregion

  // #region XMP Dynamic Media
  'xmpDM:AltTimecodeValue': 'integer',
  'xmpDM:AudioModDate': 'Date',
  'xmpDM:AudioSampleRate': 'integer',
  'xmpDM:BeatSpliceParamsRiseInDecibel': 'real',
  'xmpDM:BeatSpliceParamsRiseInTimeDurationScale': 'rational',
  'xmpDM:BeatSpliceParamsRiseInTimeDurationValue': 'integer',
  'xmpDM:BeatSpliceParamsUseFileBeatsMarker': 'boolean',
  'xmpDM:ContributedMediaDurationScale': 'rational',
  'xmpDM:ContributedMediaDurationValue': 'integer',
  'xmpDM:ContributedMediaManaged': 'boolean',
  'xmpDM:ContributedMediaStartTimeScale': 'rational',
  'xmpDM:ContributedMediaStartTimeValue': 'integer',
  'xmpDM:DurationScale': 'rational',
  'xmpDM:DurationValue': 'integer',
  'xmpDM:FileDataRate': 'rational',
  'xmpDM:Good': 'boolean',
  'xmpDM:IntroTimeScale': 'rational',
  'xmpDM:IntroTimeValue': 'integer',
  'xmpDM:Loop': 'boolean',
  'xmpDM:MarkersProbability': 'real',
  'xmpDM:MetadataModDate': 'Date',
  'xmpDM:NumberOfBeats': 'real',
  'xmpDM:OutCueScale': 'rational',
  'xmpDM:OutCueValue': 'integer',
  'xmpDM:PartOfCompilation': 'boolean',
  'xmpDM:RelativeTimestampScale': 'rational',
  'xmpDM:RelativeTimestampValue': 'integer',
  'xmpDM:ReleaseDate': 'Date',
  'xmpDM:ShotDate': 'Date',
  'xmpDM:StartTimecodeValue': 'integer',
  'xmpDM:StartTimeSampleSize': 'integer',
  'xmpDM:TakeNumber': 'integer',
  'xmpDM:Tempo': 'real',
  'xmpDM:TimeScaleParamsFrameOverlappingPercentage': 'real',
  'xmpDM:TimeScaleParamsFrameSize': 'real',
  'xmpDM:TrackNumber': 'integer',
  'xmpDM:TracksMarkersProbability': 'real',
  'xmpDM:VideoAlphaPremultipleColorA': 'integer',
  'xmpDM:VideoAlphaPremultipleColorB': 'integer',
  'xmpDM:VideoAlphaPremultipleColorBlack': 'real',
  'xmpDM:VideoAlphaPremultipleColorBlue': 'integer',
  'xmpDM:VideoAlphaPremultipleColorCyan': 'real',
  'xmpDM:VideoAlphaPremultipleColorGray': 'integer',
  'xmpDM:VideoAlphaPremultipleColorGreen': 'integer',
  'xmpDM:VideoAlphaPremultipleColorL': 'real',
  'xmpDM:VideoAlphaPremultipleColorMagenta': 'real',
  'xmpDM:VideoAlphaPremultipleColorRed': 'integer',
  'xmpDM:VideoAlphaPremultipleColorTint': 'integer',
  'xmpDM:VideoAlphaPremultipleColorYellow': 'real',
  'xmpDM:VideoAlphaUnityIsTransparent': 'boolean',
  'xmpDM:VideoFrameRate': 'real',
  'xmpDM:VideoFrameSizeH': 'real',
  'xmpDM:VideoFrameSizeW': 'real',
  'xmpDM:VideoModDate': 'Date',
  'xmpDM:VideoPixelAspectRatio': 'rational',
  // BeatSpliceStretch Struct
  'xmpDM:RiseInDecibel': 'real',
  // 'xmpDM:RiseInTimeDuration': 'Time',
  'xmpDM:Scale': 'rational',
  'xmpDM:Value': 'integer',
  'xmpDM:Managed': 'boolean',
  'xmpDM:Probability': 'real',
  'xmpDM:FrameOverlappingPercentage': 'real',
  'xmpDM:FrameSize': 'real',
  'xmpDM:A': 'integer',
  'xmpDM:B': 'integer',
  'xmpDM:L': 'real',
  'xmpDM:Black': 'real',
  'xmpDM:Blue': 'integer',
  'xmpDM:Cyan': 'real',
  'xmpDM:Gray': 'integer',
  'xmpDM:Green': 'integer',
  'xmpDM:Magenta': 'real',
  'xmpDM:Red': 'integer',
  'xmpDM:Tint': 'integer',
  'xmpDM:Yellow': 'real',
  'xmpDM:H': 'real',
  'xmpDM:W': 'real',
  // #endregion

  // #region XMP Media Management
  'xmpMM:DerivedFromLastModifyDate': 'Date',
  'xmpMM:HistoryWhen': 'Date',
  'xmpMM:IngredientsLastModifyDate': 'Date',
  'xmpMM:ManagedFromLastModifyDate': 'Date',
  'xmpMM:ManifestPlacedXResolution': 'real',
  'xmpMM:ManifestPlacedYResolution': 'real',
  'xmpMM:ManifestReferenceLastModifyDate': 'Date',
  'xmpMM:RenditionOfLastModifyDate': 'Date',
  'xmpMM:SaveID': 'integer',
  'xmpMM:VersionsEventWhen': 'Date',
  'xmpMM:VersionsModifyDate': 'Date',
  // struct
  'xmpMM:LastModifyDate': 'Date',
  'xmpMM:ResourceEvent': 'Date',
  // #endregion

  // #region other XMP-related
  'stEvt:when': 'Date',
  'xmpRights:Marked': 'boolean',
  'xmpTPg:ColorantA': 'integer',
  'xmpTPg:ColorantB': 'integer',
  'xmpTPg:ColorantBlack': 'real',
  'xmpTPg:ColorantBlue': 'integer',
  'xmpTPg:ColorantCyan': 'real',
  'xmpTPg:ColorantGray': 'integer',
  'xmpTPg:ColorantGreen': 'integer',
  'xmpTPg:ColorantL': 'real',
  'xmpTPg:ColorantMagenta': 'real',
  'xmpTPg:ColorantRed': 'integer',
  'xmpTPg:ColorantTint': 'integer',
  'xmpTPg:ColorantYellow': 'real',
  'xmpTPg:FontComposite': 'boolean',
  'xmpTPg:HasVisibleOverprint': 'boolean',
  'xmpTPg:HasVisibleTransparency': 'boolean',
  'xmpTPg:MaxPageSizeH': 'real',
  'xmpTPg:MaxPageSizeW': 'real',
  'xmpTPg:NPages': 'integer',
  'xmpTPg:SwatchColorantA': 'integer',
  'xmpTPg:SwatchColorantB': 'integer',
  'xmpTPg:SwatchColorantBlack': 'real',
  'xmpTPg:SwatchColorantBlue': 'integer',
  'xmpTPg:SwatchColorantCyan': 'real',
  'xmpTPg:SwatchColorantGray': 'integer',
  'xmpTPg:SwatchColorantGreen': 'integer',
  'xmpTPg:SwatchColorantL': 'real',
  'xmpTPg:SwatchColorantMagenta': 'real',
  'xmpTPg:SwatchColorantRed': 'integer',
  'xmpTPg:SwatchColorantTint': 'integer',
  'xmpTPg:SwatchColorantYellow': 'real',
  'xmpTPg:SwatchGroupType': 'integer',
  // #endregion
};
