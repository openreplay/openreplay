import UIKit

extension UIImage {
    func applyBlurWithRadius(_ blurRadius: CGFloat) -> UIImage? {
            if (size.width < 1 || size.height < 1) {
                return nil
            }
            guard let inputCGImage = self.cgImage else {
                return nil
            }
            let inputImage = CIImage(cgImage: inputCGImage)
            let filter = CIFilter(name: "CIGaussianBlur")
            filter?.setValue(inputImage, forKey: kCIInputImageKey)
            filter?.setValue(blurRadius, forKey: kCIInputRadiusKey)
            guard let outputImage = filter?.outputImage else {
                return nil
            }
            let context = CIContext(options: nil)
            guard let outputCGImage = context.createCGImage(outputImage, from: inputImage.extent) else {
                return nil
            }
            return UIImage(cgImage: outputCGImage)
        }
}
