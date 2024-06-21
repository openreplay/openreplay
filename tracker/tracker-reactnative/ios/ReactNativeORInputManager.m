#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(RnTrackedInputManager, RCTViewManager)

// If your view manager needs to execute methods on the main thread:
+ (BOOL)requiresMainQueueSetup
{
    return NO; // Return YES if the module needs to be initialized on the main thread
}

// Add any RCT_EXPORT_METHOD() here if your view manager exposes any methods to React Native

@end
