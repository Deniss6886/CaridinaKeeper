param(
    [Parameter(Mandatory = $true)]
    [ValidateSet(192, 512)]
    [int]$Size,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

Add-Type -AssemblyName System.Drawing

$bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::FromArgb(12, 107, 100))

$scale = $Size / 64.0
$light = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(228, 255, 248))
$dark = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(7, 27, 29))
$pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(228, 255, 248), 3 * $scale)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

$body = [System.Drawing.Drawing2D.GraphicsPath]::new()
[System.Drawing.PointF[]]$points = @(
    [System.Drawing.PointF]::new(16 * $scale, 34 * $scale),
    [System.Drawing.PointF]::new(23 * $scale, 20 * $scale),
    [System.Drawing.PointF]::new(41 * $scale, 17 * $scale),
    [System.Drawing.PointF]::new(50 * $scale, 29 * $scale),
    [System.Drawing.PointF]::new(42 * $scale, 27 * $scale),
    [System.Drawing.PointF]::new(33 * $scale, 36 * $scale),
    [System.Drawing.PointF]::new(49 * $scale, 41 * $scale),
    [System.Drawing.PointF]::new(38 * $scale, 49 * $scale),
    [System.Drawing.PointF]::new(22 * $scale, 44 * $scale)
)
$body.AddPolygon($points)
$graphics.FillPath($light, $body)
$graphics.FillEllipse($dark, 40.5 * $scale, 24.5 * $scale, 5 * $scale, 5 * $scale)

$graphics.DrawLine($pen, 18 * $scale, 34 * $scale, 11 * $scale, 24 * $scale)
$graphics.DrawLine($pen, 21 * $scale, 39 * $scale, 14 * $scale, 49 * $scale)
$graphics.DrawLine($pen, 28 * $scale, 43 * $scale, 29 * $scale, 53 * $scale)

$directory = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory | Out-Null
}

$bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$body.Dispose()
$pen.Dispose()
$dark.Dispose()
$light.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
