Add-Type -AssemblyName System.Drawing

$w = 1200
$h = 630
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

function Color([int]$r, [int]$g, [int]$b, [int]$a = 255) {
  return [System.Drawing.Color]::FromArgb($a, $r, $g, $b)
}

$bg = New-Object System.Drawing.SolidBrush (Color 7 8 11)
$g.FillRectangle($bg, 0, 0, $w, $h)

$grid = New-Object System.Drawing.Pen (Color 18 23 34), 1
for ($x = 0; $x -lt $w; $x += 40) { $g.DrawLine($grid, $x, 0, $x, $h) }
for ($y = 0; $y -lt $h; $y += 40) { $g.DrawLine($grid, 0, $y, $w, $y) }

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddEllipse(180, -280, 840, 520)
$glow = New-Object System.Drawing.Drawing2D.PathGradientBrush $path
$glow.CenterColor = Color 255 77 26 90
$glow.SurroundColors = @(Color 255 77 26 0)
$g.FillPath($glow, $path)

$path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
$path2.AddEllipse(720, 80, 560, 560)
$glow2 = New-Object System.Drawing.Drawing2D.PathGradientBrush $path2
$glow2.CenterColor = Color 34 229 255 36
$glow2.SurroundColors = @(Color 34 229 255 0)
$g.FillPath($glow2, $path2)

$bar = New-Object System.Drawing.Drawing2D.LinearGradientBrush (
  (New-Object System.Drawing.Point 0, 0),
  (New-Object System.Drawing.Point $w, 0),
  (Color 255 77 26),
  (Color 34 229 255)
)
$g.FillRectangle($bar, 0, 0, $w, 8)

function Draw-Hex([single]$cx, [single]$cy, [single]$r, $pen) {
  $pts = @()
  for ($i = 0; $i -lt 6; $i++) {
    $ang = [Math]::PI / 180 * (-90 + $i * 60)
    $pts += New-Object System.Drawing.PointF ([single]($cx + $r * [Math]::Cos($ang))), ([single]($cy + $r * [Math]::Sin($ang)))
  }
  $g.DrawPolygon($pen, $pts)
}

$hx = 930
$hy = 300
$hex = New-Object System.Drawing.Pen (Color 34 229 255), 10
$hex.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
Draw-Hex $hx $hy 168 $hex
$lime = New-Object System.Drawing.Pen (Color 198 255 61), 10
$lime.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$lime.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawLine($lime, ($hx + 168 * [Math]::Cos([Math]::PI / 180 * -90)), ($hy + 168 * [Math]::Sin([Math]::PI / 180 * -90)), ($hx + 168 * [Math]::Cos([Math]::PI / 180 * -30)), ($hy + 168 * [Math]::Sin([Math]::PI / 180 * -30)))

$flame = New-Object System.Drawing.Drawing2D.GraphicsPath
$flame.AddPolygon(@(
  (New-Object System.Drawing.PointF 936, 188),
  (New-Object System.Drawing.PointF 998, 258),
  (New-Object System.Drawing.PointF 1024, 328),
  (New-Object System.Drawing.PointF 1012, 398),
  (New-Object System.Drawing.PointF 970, 430),
  (New-Object System.Drawing.PointF 892, 430),
  (New-Object System.Drawing.PointF 850, 398),
  (New-Object System.Drawing.PointF 840, 336),
  (New-Object System.Drawing.PointF 870, 270),
  (New-Object System.Drawing.PointF 896, 312),
  (New-Object System.Drawing.PointF 912, 242)
))
$g.FillPath((New-Object System.Drawing.SolidBrush (Color 255 77 26)), $flame)

$core = New-Object System.Drawing.Drawing2D.GraphicsPath
$core.AddPolygon(@(
  (New-Object System.Drawing.PointF 928, 292),
  (New-Object System.Drawing.PointF 966, 344),
  (New-Object System.Drawing.PointF 972, 388),
  (New-Object System.Drawing.PointF 950, 420),
  (New-Object System.Drawing.PointF 906, 420),
  (New-Object System.Drawing.PointF 884, 388),
  (New-Object System.Drawing.PointF 890, 350),
  (New-Object System.Drawing.PointF 912, 326),
  (New-Object System.Drawing.PointF 918, 352)
))
$g.FillPath((New-Object System.Drawing.SolidBrush (Color 255 214 10)), $core)

$titleFont = New-Object System.Drawing.Font "Arial", 78, ([System.Drawing.FontStyle]::Bold)
$subFont = New-Object System.Drawing.Font "Arial", 22, ([System.Drawing.FontStyle]::Regular)
$eyeFont = New-Object System.Drawing.Font "Consolas", 18, ([System.Drawing.FontStyle]::Bold)
$chipFont = New-Object System.Drawing.Font "Arial", 16, ([System.Drawing.FontStyle]::Bold)

$g.DrawString("ULTIMATE TECH LEAGUE", $eyeFont, (New-Object System.Drawing.SolidBrush (Color 34 229 255)), 78, 148)
$g.DrawString("IGNITION", $titleFont, (New-Object System.Drawing.SolidBrush (Color 242 244 247)), 72, 186)
$g.DrawString("ARENA", $titleFont, (New-Object System.Drawing.SolidBrush (Color 255 77 26)), 72, 286)
$g.DrawString("Live RoboWar board. Crowd cheers. VIP Sparks.", $subFont, (New-Object System.Drawing.SolidBrush (Color 195 202 214)), 78, 430)

function Draw-Chip([single]$x, [string]$label, $fg, $fill) {
  $size = $g.MeasureString($label, $chipFont)
  $padX = 16
  $padY = 8
  $rw = [single]($size.Width + $padX * 2)
  $rh = 36
  $rect = New-Object System.Drawing.RectangleF $x, 500, $rw, $rh
  $g.FillRectangle((New-Object System.Drawing.SolidBrush $fill), $rect)
  $pen = New-Object System.Drawing.Pen $fg, 2
  $g.DrawRectangle($pen, $rect.X, $rect.Y, $rect.Width, $rect.Height)
  $g.DrawString($label, $chipFont, (New-Object System.Drawing.SolidBrush $fg), ($x + $padX), 508)
  return $rw
}

$x0 = 78
$x0 += (Draw-Chip $x0 "CHEER" (Color 34 229 255) (Color 8 28 34)) + 12
$x0 += (Draw-Chip $x0 "VIP LOUNGE" (Color 255 214 10) (Color 32 26 4)) + 12
Draw-Chip $x0 "NO REAL MONEY" (Color 198 255 61) (Color 16 24 4) | Out-Null

$out = Join-Path $PSScriptRoot "..\public\og.png"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output $out
