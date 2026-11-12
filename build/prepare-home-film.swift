import Foundation
import AVFoundation
import AppKit

// Silent editorial montage from the unwatermarked Mixkit originals.
// Usage: swift build/prepare-home-film.swift output.mp4 clip1.mp4 clip2.mp4 ...
@main struct PrepareFilm {
  static func main() async throws {
    let arguments=Array(CommandLine.arguments.dropFirst())
    guard arguments.count>1 else { fatalError("Provide output and source clips") }
    let output=URL(fileURLWithPath:arguments[0])
    let composition=AVMutableComposition()
    guard let track=composition.addMutableTrack(withMediaType:.video,preferredTrackID:kCMPersistentTrackID_Invalid) else { fatalError("No video track") }
    var cursor=CMTime.zero
    for input in arguments.dropFirst() {
      let asset=AVURLAsset(url:URL(fileURLWithPath:input))
      guard let source=try await asset.loadTracks(withMediaType:.video).first else { fatalError("Missing video track") }
      let duration=try await asset.load(.duration)
      let segment=CMTimeMinimum(duration,CMTime(seconds:18,preferredTimescale:600))
      try track.insertTimeRange(CMTimeRange(start:.zero,duration:segment),of:source,at:cursor)
      cursor=CMTimeAdd(cursor,segment)
    }
    guard let exporter=AVAssetExportSession(asset:composition,presetName:AVAssetExportPreset1280x720) else { fatalError("Cannot create exporter") }
    exporter.shouldOptimizeForNetworkUse=true
    try await exporter.export(to:output,as:.mp4)
    let generator=AVAssetImageGenerator(asset:AVURLAsset(url:output))
    generator.appliesPreferredTrackTransform=true
    let (image,_)=try await generator.image(at:CMTime(seconds:3,preferredTimescale:600))
    let poster=output.deletingPathExtension().appendingPathExtension("png")
    let representation=NSBitmapImageRep(cgImage:image)
    try representation.representation(using:.png,properties:[:])!.write(to:poster)
    print("Prepared silent film: \(CMTimeGetSeconds(cursor)) seconds")
  }
}
