; Deep Work Concierge — Inno Setup Script
; Compile with Inno Setup 6.x: https://jrsoftware.org/isinfo.php

#define AppName    "Deep Work Concierge"
#define AppVersion "1.0.0"
#define AppPublisher "Deep Work Concierge"
#define AppURL     "https://github.com/yourusername/deep-work-concierge"
#define AppExe     "DDC.exe"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
OutputDir=Output
OutputBaseFilename=DDC_Installer
SetupIconFile=icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
MinVersion=10.0
UsedUserAreasWarning=no
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes
; Show a "Finish" page with a launch checkbox
AlwaysShowDirOnReadyPage=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon";  Description: "Create a &desktop shortcut";          GroupDescription: "Additional icons:"; Flags: unchecked
Name: "autostart";    Description: "Start automatically with &Windows";    GroupDescription: "Startup:";          Flags: unchecked

[Files]
Source: "..\server\dist\DDC\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{group}\{#AppName}";             Filename: "{app}\{#AppExe}"
Name: "{group}\Uninstall {#AppName}";   Filename: "{uninstallexe}"
Name: "{commondesktop}\{#AppName}";     Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Registry]
; Auto-start at login — only created if user checked the task
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
  ValueType: string; ValueName: "DeepWorkConcierge"; \
  ValueData: """{app}\{#AppExe}"""; \
  Flags: uninsdeletevalue; Tasks: autostart

[Run]
Filename: "{app}\{#AppExe}"; \
  Description: "Launch {#AppName} now"; \
  Flags: postinstall nowait skipifsilent

[UninstallDelete]
; Remove the EXE directory
Type: filesandordirs; Name: "{app}"
; Also clean up the AppData config so uninstall is truly clean
Type: filesandordirs; Name: "{userappdata}\DeepWorkConcierge"

[Code]
// Check whether DDC.exe is running before installing/uninstalling.
// Prompt the user to close it rather than silently failing.
function FindProcess(const Name: String): Boolean;
var
  WbemLocator, WbemServices, WbemObjectSet: Variant;
begin
  Result := False;
  try
    WbemLocator  := CreateOleObject('WbemScripting.SWbemLocator');
    WbemServices := WbemLocator.ConnectServer('.', 'root\CIMV2', '', '');
    WbemObjectSet := WbemServices.ExecQuery(
      'SELECT Name FROM Win32_Process WHERE Name="' + Name + '"');
    Result := (WbemObjectSet.Count > 0);
  except
    // If WMI fails just proceed
  end;
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
  if FindProcess('DDC.exe') then
  begin
    if MsgBox(
      'Deep Work Concierge is currently running.' + #13#10 +
      'Please close it before continuing installation.' + #13#10#13#10 +
      'Click OK once it is closed, or Cancel to abort.',
      mbConfirmation, MB_OKCANCEL) = IDCANCEL then
      Result := False;
  end;
end;

function InitializeUninstall(): Boolean;
begin
  Result := True;
  if FindProcess('DDC.exe') then
  begin
    if MsgBox(
      'Deep Work Concierge is currently running.' + #13#10 +
      'Please close it before uninstalling.' + #13#10#13#10 +
      'Click OK once it is closed, or Cancel to abort.',
      mbConfirmation, MB_OKCANCEL) = IDCANCEL then
      Result := False;
  end;
end;
