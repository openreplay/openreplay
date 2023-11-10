import UIKit

open class PerformanceListener: NSObject {
    public static let shared = PerformanceListener()
    private var cpuTimer: Timer?
    private var cpuIteration = 0
    private var memTimer: Timer?
    public var isActive = false
    
    func start() {
        #warning("Can interfere with client usage")
        UIDevice.current.isBatteryMonitoringEnabled = true
        UIDevice.current.beginGeneratingDeviceOrientationNotifications()
        
        let observe: (Notification.Name) -> Void = {
            NotificationCenter.default.addObserver(self, selector: #selector(self.notified(_:)), name: $0, object: nil)
        }
        observe(.NSBundleResourceRequestLowDiskSpace)
        observe(.NSProcessInfoPowerStateDidChange)
        observe(ProcessInfo.thermalStateDidChangeNotification)
        observe(UIApplication.didReceiveMemoryWarningNotification)
        observe(UIDevice.batteryLevelDidChangeNotification)
        observe(UIDevice.batteryStateDidChangeNotification)
        observe(UIDevice.orientationDidChangeNotification)

        getCpuMessage()
        getMemoryMessage()
        
        cpuTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true, block: { (_) in
            self.getCpuMessage()
        })

        memTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: true, block: { (_) in
            self.getMemoryMessage()
        })
        isActive = true
        
        
        NotificationCenter.default.addObserver(self, selector: #selector(pause), name: UIApplication.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(resume), name: UIApplication.willEnterForegroundNotification, object: nil)
    }
    
    @objc func resume() {
        #if DEBUG
        DebugUtils.log("Resume")
        #endif
        getCpuMessage()
        getMemoryMessage()
        MessageCollector.shared.sendMessage(ORIOSPerformanceEvent(name: "background", value: UInt64(0)))
    }
    
    @objc func pause() {
        #if DEBUG
        DebugUtils.log("Background")
        #endif
        MessageCollector.shared.sendMessage(ORIOSPerformanceEvent(name: "background", value: UInt64(1)))
    }
    
    func getCpuMessage() {
        if let cpu = self.cpuUsage() {
            MessageCollector.shared.sendMessage(ORIOSPerformanceEvent(name: "mainThreadCPU", value: UInt64(cpu)))
        }
    }
    
    func getMemoryMessage() {
        if let mem = self.memoryUsage() {
            MessageCollector.shared.sendMessage(ORIOSPerformanceEvent(name: "memoryUsage", value: UInt64(mem)))
        }
    }
    
    func stop() {
        if isActive {
            UIDevice.current.isBatteryMonitoringEnabled = false
            UIDevice.current.endGeneratingDeviceOrientationNotifications()

            NotificationCenter.default.removeObserver(self, name: .NSBundleResourceRequestLowDiskSpace, object: nil)
            NotificationCenter.default.removeObserver(self, name: .NSProcessInfoPowerStateDidChange, object: nil)
            NotificationCenter.default.removeObserver(self, name: ProcessInfo.thermalStateDidChangeNotification, object: nil)
            NotificationCenter.default.removeObserver(self, name: UIApplication.didReceiveMemoryWarningNotification, object: nil)
            NotificationCenter.default.removeObserver(self, name: UIDevice.batteryLevelDidChangeNotification, object: nil)
            NotificationCenter.default.removeObserver(self, name: UIDevice.batteryStateDidChangeNotification, object: nil)
            NotificationCenter.default.removeObserver(self, name: UIDevice.orientationDidChangeNotification, object: nil)
            NotificationCenter.default.removeObserver(self, name: UIApplication.didEnterBackgroundNotification, object: nil)
            NotificationCenter.default.removeObserver(self, name: UIApplication.willEnterForegroundNotification, object: nil)
            
            cpuTimer?.invalidate()
            cpuTimer = nil
            memTimer?.invalidate()
            memTimer = nil
            
            isActive = false
        }
    }
    
    public func sendBattery() {
        let message = ORIOSPerformanceEvent(name: "batteryLevel", value: 20)
        
        MessageCollector.shared.sendMessage(message)
    }
    
    public func sendThermal() {
        let message2 = ORIOSPerformanceEvent(name: "thermalState", value: 2)
        MessageCollector.shared.sendMessage(message2)
    }

    @objc func notified(_ notification: Notification) {
        var message: ORIOSPerformanceEvent? = nil
        switch notification.name {
        case .NSBundleResourceRequestLowDiskSpace:
            message = ORIOSPerformanceEvent(name: "lowDiskSpace", value: 0)
        case .NSProcessInfoPowerStateDidChange:
            message = ORIOSPerformanceEvent(name: "isLowPowerModeEnabled", value: ProcessInfo.processInfo.isLowPowerModeEnabled ? 1 : 0)
        case ProcessInfo.thermalStateDidChangeNotification:
            message = ORIOSPerformanceEvent(name: "thermalState", value: UInt64(ProcessInfo.processInfo.thermalState.rawValue)) 
        case UIApplication.didReceiveMemoryWarningNotification:
            message = ORIOSPerformanceEvent(name: "memoryWarning", value: 0)
        case UIDevice.batteryLevelDidChangeNotification:
            message = ORIOSPerformanceEvent(name: "batteryLevel", value: UInt64(max(0.0, UIDevice.current.batteryLevel)*100))
        case UIDevice.batteryStateDidChangeNotification:
            message = ORIOSPerformanceEvent(name: "batteryState", value: UInt64(UIDevice.current.batteryState.rawValue))
        case UIDevice.orientationDidChangeNotification:
            message = ORIOSPerformanceEvent(name: "orientation", value: UInt64(UIDevice.current.orientation.rawValue))
        default: break
        }
        if let message = message {
            MessageCollector.shared.sendMessage(message)
        }
    }
    
    func networkStateChange(_ state: UInt64) {
        let message = ORIOSPerformanceEvent(name: "networkState", value: state)
        MessageCollector.shared.sendMessage(message)
    }

    func memoryUsage() -> UInt64? {
        var taskInfo = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info>.size) / 4
        let result: kern_return_t = withUnsafeMutablePointer(to: &taskInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
            }
        }

        guard result == KERN_SUCCESS else {
            return nil
        }
        return UInt64(taskInfo.phys_footprint)
    }

    func cpuUsage() -> Double? {
        var threadsListContainer: thread_act_array_t?
        var threadsCount = mach_msg_type_number_t(0)
        let threadsResult = withUnsafeMutablePointer(to: &threadsListContainer) {
            return $0.withMemoryRebound(to: thread_act_array_t?.self, capacity: 1) {
                task_threads(mach_task_self_, $0, &threadsCount)
            }
        }
        defer {
            vm_deallocate(mach_task_self_, vm_address_t(UInt(bitPattern: threadsListContainer)), vm_size_t(Int(threadsCount) * MemoryLayout<thread_t>.stride))
        }

        guard threadsCount > 0, threadsResult == KERN_SUCCESS, let threadsList = threadsListContainer else {
            return nil
        }
        var threadInfo = thread_basic_info()
        var threadInfoCount = mach_msg_type_number_t(THREAD_INFO_MAX)
        let infoResult = withUnsafeMutablePointer(to: &threadInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                thread_info(threadsList[0], thread_flavor_t(THREAD_BASIC_INFO), $0, &threadInfoCount)
            }
        }

        let threadBasicInfo = threadInfo as thread_basic_info
        guard infoResult == KERN_SUCCESS, threadBasicInfo.flags & TH_FLAGS_IDLE == 0 else { return nil }
        return Double(threadBasicInfo.cpu_usage) / Double(TH_USAGE_SCALE) * 100.0
    }
}
