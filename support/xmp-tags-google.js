export const tagTypeMap = {
  // #region Google depth-map Device
  'Device:CameraDepthMapFar': 'real',
  'Device:CameraDepthMapFocalTableEntryCount': 'integer',
  'Device:CameraDepthMapNear': 'real',
  'Device:CameraImagingModelDistortionCount': 'integer',
  'Device:CameraImagingModelFocalLengthX': 'real',
  'Device:CameraImagingModelFocalLengthY': 'real',
  'Device:CameraImagingModelImageHeight': 'integer',
  'Device:CameraImagingModelImageWidth': 'integer',
  'Device:CameraImagingModelPixelAspectRatio': 'real',
  'Device:CameraImagingModelPrincipalPointX': 'real',
  'Device:CameraImagingModelPrincipalPointY': 'real',
  'Device:CameraImagingModelSkew': 'real',
  'Device:CameraLightEstimateColorCorrectionB': 'real',
  'Device:CameraLightEstimateColorCorrectionG': 'real',
  'Device:CameraLightEstimateColorCorrectionR': 'real',
  'Device:CameraLightEstimatePixelIntensity': 'real',
  'Device:CameraPointCloudMetric': 'boolean',
  'Device:CameraPointCloudPointCloud': 'integer',
  'Device:CameraPosePositionX': 'real',
  'Device:CameraPosePositionY': 'real',
  'Device:CameraPosePositionZ': 'real',
  'Device:CameraPoseRotationW': 'real',
  'Device:CameraPoseRotationX': 'real',
  'Device:CameraPoseRotationY': 'real',
  'Device:CameraPoseRotationZ': 'real',
  'Device:CameraPoseTimestamp': 'integer',
  'Device:ContainerDirectoryItemLength': 'integer',
  'Device:ContainerDirectoryItemPadding': 'integer',
  'Device:EarthPosAltitude': 'real',
  'Device:EarthPosLatitude': 'real',
  'Device:EarthPosLongitude': 'real',
  'Device:EarthPosRotationW': 'real',
  'Device:EarthPosRotationX': 'real',
  'Device:EarthPosRotationY': 'real',
  'Device:EarthPosRotationZ': 'real',
  'Device:EarthPosTimestamp': 'integer',
  'Device:PlaneBoundaryVertexCount': 'integer',
  'Device:PlaneExtentX': 'real',
  'Device:PlaneExtentZ': 'real',
  'Device:PlanePosePositionX': 'real',
  'Device:PlanePosePositionY': 'real',
  'Device:PlanePosePositionZ': 'real',
  'Device:PlanePoseRotationW': 'real',
  'Device:PlanePoseRotationX': 'real',
  'Device:PlanePoseRotationY': 'real',
  'Device:PlanePoseRotationZ': 'real',
  'Device:PlanePoseTimestamp': 'integer',
  'Device:PosePositionX': 'real',
  'Device:PosePositionY': 'real',
  'Device:PosePositionZ': 'real',
  'Device:PoseRotationW': 'real',
  'Device:PoseRotationX': 'real',
  'Device:PoseRotationY': 'real',
  'Device:PoseRotationZ': 'real',
  'Device:PoseTimestamp': 'integer',
  'Device:ProfileCameraIndices': 'integer',
  // #endregion

  // #region GAudio
  'GAudio:Data': 'base64',
  // #endregion

  // #region GCamera
  'GCamera:MicroVideo': 'integer',
  'GCamera:MicroVideoOffset': 'integer',
  'GCamera:MicroVideoPresentationTimestampUs': 'integer',
  'GCamera:MicroVideoVersion': 'integer',
  // #endregion

  // #region GCreations
  // #endregion

  // #region GDepth
  'GDepth:Far': 'real[]',
  'GDepth:ImageHeight': 'real[]',
  'GDepth:ImageWidth': 'real[]',
  'GDepth:Near': 'real[]',
  // #endregion

  // #region GFocus
  'GFocus:BlurAtInfinity': 'real',
  'GFocus:FocalDistance': 'real',
  'GFocus:FocalPointX': 'real',
  'GFocus:FocalPointY': 'real',
  // #endregion

  // #region GImage
  'GImage:Data': 'base64',
  // #endregion

  // #region GPano
  'GPano:CroppedAreaImageHeightPixels': 'real',
  'GPano:CroppedAreaImageWidthPixels': 'real',
  'GPano:CroppedAreaLeftPixels': 'real',
  'GPano:CroppedAreaTopPixels': 'real',
  'GPano:ExposureLockUsed': 'boolean',
  'GPano:FirstPhotoDate': 'Date',
  'GPano:FullPanoHeightPixels': 'real',
  'GPano:FullPanoWidthPixels': 'real',
  'GPano:InitialCameraDolly': 'real',
  'GPano:InitialHorizontalFOVDegrees': 'real',
  'GPano:InitialVerticalFOVDegrees': 'real',
  'GPano:InitialViewHeadingDegrees': 'real',
  'GPano:InitialViewPitchDegrees': 'real',
  'GPano:InitialViewRollDegrees': 'real',
  'GPano:LargestValidInteriorRectHeight': 'real',
  'GPano:LargestValidInteriorRectLeft': 'real',
  'GPano:LargestValidInteriorRectTop': 'real',
  'GPano:LargestValidInteriorRectWidth': 'real',
  'GPano:LastPhotoDate': 'Date',
  'GPano:PoseHeadingDegrees': 'real',
  'GPano:PosePitchDegrees': 'real',
  'GPano:PoseRollDegrees': 'real',
  'GPano:SourcePhotosCount': 'integer',
  'GPano:UsePanoramaViewer': 'boolean',
  // #endregion

  // #region GSpherical
  'GSpherical:CroppedAreaImageHeightPixels': 'integer[]',
  'GSpherical:CroppedAreaImageWidthPixels': 'integer[]',
  'GSpherical:CroppedAreaLeftPixels': 'integer[]',
  'GSpherical:CroppedAreaTopPixels': 'integer[]',
  'GSpherical:FullPanoHeightPixels': 'integer[]',
  'GSpherical:FullPanoWidthPixels': 'integer[]',
  'GSpherical:InitialViewHeadingDegrees': 'real[]',
  'GSpherical:InitialViewPitchDegrees': 'real[]',
  'GSpherical:InitialViewRollDegrees': 'real[]',
  'GSpherical:SourceCount': 'integer[]',
  'GSpherical:Spherical': 'boolean[]',
  'GSpherical:Stitched': 'boolean[]',
  'GSpherical:TimeStamp': 'integer[]',
  // #endregion
};
