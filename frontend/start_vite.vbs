Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "S:\smart-kirana\frontend"
WshShell.Run "cmd.exe /c npm.cmd run dev > dev_log.txt 2>&1", 0, False
