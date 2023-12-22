[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
Param(
    [Parameter(Mandatory = $false)]
    [string]
    $PackageName,
    [Parameter(Mandatory = $false)]
    [string]
    $PackageTitle,
    [Parameter(Mandatory = $false)]
    [string]
    $PackageDescription
)
Process {

    #Requires -Version 7.0.0
    Set-StrictMode -Version "Latest"
    $ErrorActionPreference = "Stop"
    $LASTEXITCODE = 0
    $ScriptPath = Split-Path $MyInvocation.MyCommand.Path

    Write-Verbose "Script path is '$ScriptPath'"

    Function Write-Parameters() {
        $filesToSearch = Get-ChildItem -Path $ScriptPath -Directory -Recurse `
            | Where-Object { $_.PSPATH -notLike '*node_modules*' } `
            | Get-ChildItem -File -Recurse `
            | Select-Object -ExpandProperty FullName

        $filesToSearch += Get-ChildItem -Path $ScriptPath -File `
            | Where-Object { $_.PSPATH -notLike '*.ps1' } `
            | Select-Object -ExpandProperty FullName

        Write-Verbose "Files to search for replacements"
        Write-Verbose ($filesToSearch | Format-List | Out-String)

        foreach ($file in $filesToSearch) {
            Write-Verbose "Getting content of file '$file'"
            $content = Get-Content -Path $file -Encoding UTF8

            if (
                ($content | Where-Object { $_ -match "{{package-name}}" } | Measure-Object).Count -gt 0 -or `
                ($content | Where-Object { $_ -match "{{package-title}}" } | Measure-Object).Count -gt 0 -or `
                ($content | Where-Object { $_ -match "{{package-description}}" } | Measure-Object).Count -gt 0) {

                $content = $content | Foreach-Object { $_ -replace "{{package-name}}", $PackageName }
                $content = $content | Foreach-Object { $_ -replace "{{package-title}}", $PackageTitle }
                $content = $content | Foreach-Object { $_ -replace "{{package-description}}", $PackageDescription}

                Write-Verbose "Writting back content with tokens replaced to '$file'"
                Set-Content -Path "$file" -Value ($content -join "`n") -Encoding utf8NoBOM -NoNewline
            }
        }
    }

    if (-not$PackageName) {
        $PackageName = Read-Host -Prompt "Input your package name (Example ts-node-package)"
    }
    if (-not$PackageTitle) {
        $PackageTitle = Read-Host -Prompt "Input your package title (Example TS Node Package)"
    }
    if (-not$PackageDescription) {
        $PackageDescription = Read-Host -Prompt "Input your package description (Example A package that does this to help with that)"
    }

    if (($PackageName.Length -le 0) -or ($PackageTitle.Length -le 0) -or ($PackageDescription.Length -le 0)) {
        Write-Error "One or more parameters are invalid."
        Exit 1
    }

    Write-Host "Your package will be named '$PackageName'"
    Write-Host "Your package will have the title of '$PackageTitle'"
    Write-Host "Your package will have the description of '$PackageDescription'"

    $response = Read-Host "Is this correct [y/n]"
    $response = $response.ToString().ToLower().Trim()

    Write-Verbose "User response '$response'"

    switch ($response) {
        y {
            Write-Parameters
        }
        n {
            exit 0
        }
        default {
            Write-Warning "Invalid response"
            exit 1
        }
    }
}
