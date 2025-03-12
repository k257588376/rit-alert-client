SetTitleMatchMode 2 

SwitchAndHide(){

    if GetCurrentDesktopNumber() != 0 {
        GoToDesktopNumber(0)
    }
    
    if WinExist("Подключение к") ; RDP
      WinMinimize()
    
    if WinExist("ahk_exe Code.exe") {
        WinSetAlwaysOnTop True
        WinMoveTop
        WinSetAlwaysOnTop False
        WinActivate
    }
}

; Path to the DLL, relative to the script
VDA_PATH := A_ScriptDir . "\VirtualDesktopAccessor.dll"
hVirtualDesktopAccessor := DllCall("LoadLibrary", "Str", VDA_PATH, "Ptr")

GoToDesktopNumberProc := DllCall("GetProcAddress", "Ptr", hVirtualDesktopAccessor, "AStr", "GoToDesktopNumber", "Ptr")
GetCurrentDesktopNumberProc := DllCall("GetProcAddress", "Ptr", hVirtualDesktopAccessor, "AStr", "GetCurrentDesktopNumber", "Ptr")

GetCurrentDesktopNumber() {
    global GetCurrentDesktopNumberProc
    current := DllCall(GetCurrentDesktopNumberProc, "Int")
    return current
}

GoToDesktopNumber(num) {
    global GoToDesktopNumberProc
    DllCall(GoToDesktopNumberProc, "Int", num, "Int")
    return 
}

SwitchAndHide()