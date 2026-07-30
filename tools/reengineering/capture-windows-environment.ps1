$ErrorActionPreference = 'Stop'

$browserCandidates = @(
    @{ Name = 'Google Chrome'; Path = 'C:\Program Files\Google\Chrome\Application\chrome.exe' },
    @{ Name = 'Google Chrome'; Path = 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe' },
    @{ Name = 'Microsoft Edge'; Path = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' },
    @{ Name = 'Microsoft Edge'; Path = 'C:\Program Files\Microsoft\Edge\Application\msedge.exe' }
)

$browsers = foreach ($candidate in $browserCandidates) {
    if (Test-Path -LiteralPath $candidate.Path -PathType Leaf) {
        $item = Get-Item -LiteralPath $candidate.Path
        [ordered]@{
            name = $candidate.Name
            path = $candidate.Path
            version = $item.VersionInfo.ProductVersion
        }
    }
}

$cpu = Get-ItemProperty -LiteralPath 'HKLM:\HARDWARE\DESCRIPTION\System\CentralProcessor\0'
$computerSystem = Get-CimInstance -ClassName Win32_ComputerSystem
$videoControllers = Get-CimInstance -ClassName Win32_VideoController |
    Select-Object Name, DriverVersion, AdapterRAM

$record = [ordered]@{
    schema = 'latticework.environment.windows.v1'
    captured_at = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    operating_system = [ordered]@{
        description = [System.Runtime.InteropServices.RuntimeInformation]::OSDescription
        version = [System.Environment]::OSVersion.VersionString
        architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
    }
    cpu = [ordered]@{
        name = $cpu.ProcessorNameString
        logical_processors = [System.Environment]::ProcessorCount
    }
    memory = [ordered]@{
        total_bytes = [int64]$computerSystem.TotalPhysicalMemory
    }
    gpu = @($videoControllers | ForEach-Object {
        [ordered]@{
            name = $_.Name
            driver_version = $_.DriverVersion
            adapter_ram = if ($null -eq $_.AdapterRAM) { $null } else { [int64]$_.AdapterRAM }
        }
    })
    browsers = @($browsers)
    tools = [ordered]@{
        powershell = $PSVersionTable.PSVersion.ToString()
        node = (& node --version)
        npm = (& npm --version)
        git = (& git --version)
        ripgrep = (& rg --version | Select-Object -First 1)
        python = (& python --version 2>&1)
    }
}

$record | ConvertTo-Json -Depth 8
