$files = Get-ChildItem -Path "app" -Filter "*.tsx" -Recurse -File

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace 'container mx-auto px-4', 'container max-w-[1920px] mx-auto px-2'
    
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "Done!"
