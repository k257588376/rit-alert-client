[Console]::InputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

#Load Types from Assemblies (https://github.com/PowerShell/PowerShell/issues/13042)
$Assembly = [pscustomobject]@{name = 'Microsoft.Windows.SDK.NET.Ref'; version = '10.0.20348.20'; files = @('lib/WinRT.Runtime.dll'; 'lib/Microsoft.Windows.SDK.NET.dll') }
$Package = Get-Package -Name $Assembly.name -Scope CurrentUser -ErrorAction SilentlyContinue
if (!$Package) {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Install-Package -Name $Assembly.name -RequiredVersion $Assembly.version -ProviderName NuGet -Source 'https://www.nuget.org/api/v2' -Force -Scope CurrentUser
  $Package = Get-Package -Name $Assembly.name -Scope CurrentUser -ErrorAction Stop
} 
$Source = Split-Path -Path $Package.Source
ForEach ($File in $Assembly.files) {
  $FilePath = Join-Path -Path $Source -ChildPath $File
  Add-Type -Path $FilePath -ErrorAction Stop
}

# 'Settings' application ID
$AppId = "windows.immersivecontrolpanel_cw5n1h2txyewy!microsoft.windows.immersivecontrolpanel"

# Create a toast notifier for the app
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($AppId)

# Variable to keep track of the last displayed toast
$lastToast = $null

# Function to generate a Toast XML document given the notification message.
function New-ToastXml($message) {
  $doc = New-Object Windows.Data.Xml.Dom.XmlDocument
  $doc.LoadXml($message)
  return $doc
}

# Continuously read from standard input until the stream is closed.
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
    
  # Hide previous notification if one exists.
  if ($null -ne $lastToast) {
    $notifier.Hide($lastToast)
  }
    
  # Create a new toast notification.
  $xmlDoc = New-ToastXml $line
  $toast = [Windows.UI.Notifications.ToastNotification]::new($xmlDoc)
  $toast.ExpirationTime = [Console]::In.ReadLine()

  # Show the toast.
  $notifier.Show($toast)
    
  # Keep a reference to hide later if needed.
  $lastToast = $toast
}