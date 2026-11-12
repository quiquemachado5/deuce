import Foundation
import AVFoundation

@main struct CompressFilm {
  static func main() async throws {
    let input=URL(fileURLWithPath:CommandLine.arguments[1])
    let output=URL(fileURLWithPath:CommandLine.arguments[2])
    let asset=AVURLAsset(url:input)
    let track=try await asset.loadTracks(withMediaType:.video)[0]
    let size=try await track.load(.naturalSize)
    let reader=try AVAssetReader(asset:asset)
    let read=AVAssetReaderTrackOutput(track:track,outputSettings:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange])
    read.alwaysCopiesSampleData=false
    reader.add(read)
    let writer=try AVAssetWriter(outputURL:output,fileType:.mp4)
    writer.shouldOptimizeForNetworkUse=true
    let write=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:Int(size.width),AVVideoHeightKey:Int(size.height),AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:1_500_000,AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel,AVVideoMaxKeyFrameIntervalKey:60]])
    writer.add(write)
    writer.startWriting();reader.startReading();writer.startSession(atSourceTime:.zero)
    while reader.status == .reading {
      if !write.isReadyForMoreMediaData { try await Task.sleep(for:.milliseconds(2));continue }
      guard let sample=read.copyNextSampleBuffer() else {break}
      if !write.append(sample){throw writer.error!}
    }
    write.markAsFinished()
    await writer.finishWriting()
    if let error=reader.error{throw error}
    if let error=writer.error{throw error}
    print("Compressed H.264 \(Int(size.width))×\(Int(size.height)) at 1.5 Mbps")
  }
}
