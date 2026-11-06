; Always install for the current user only: no "all users / only me" page, no admin prompt.
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend
