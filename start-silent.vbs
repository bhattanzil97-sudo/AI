' CHAT AI - Silent Background Server Launcher for Windows
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get project directory from current script location
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
If fso.FolderExists(scriptDir) Then
    WshShell.CurrentDirectory = scriptDir
    ' Run silently without showing any black console window (WindowStyle = 0)
    cmdLine = "cmd.exe /c ""set PATH=C:\Users\LENOVO\AppData\Local\Programs\NodeJS;C:\Users\LENOVO\AppData\Local\Programs\MinGit\cmd;%PATH% && npm run dev"""
    WshShell.Run cmdLine, 0, False
End If
