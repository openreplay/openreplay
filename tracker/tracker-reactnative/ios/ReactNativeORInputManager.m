#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(RnTrackedInputManager, RCTViewManager)

// The iOS SDK derives the input label from `placeholder`, so `trackingLabel`
// (Android only) is deliberately not exported here - see ORTrackedInputProps.
RCT_EXPORT_VIEW_PROPERTY(placeholder, NSString)

@end
