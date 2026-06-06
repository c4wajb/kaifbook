#!/bin/bash
# Download real restaurant photos to local storage
set -e

DIR="/opt/reserve-kursk/current/public/images/restaurants"
mkdir -p "$DIR"

download() {
  local slug="$1"
  local url="$2"
  local ext="${3:-jpg}"
  local out="$DIR/${slug}.${ext}"

  if [ -f "$out" ] && [ -s "$out" ]; then
    echo "SKIP $slug (exists)"
    return
  fi

  echo -n "  $slug ... "
  if curl -fsSL --max-time 15 -o "$out" "$url" 2>/dev/null; then
    local size=$(stat -c%s "$out" 2>/dev/null || echo 0)
    if [ "$size" -gt 1000 ]; then
      echo "OK ($(( size / 1024 ))KB)"
    else
      echo "FAIL (too small: ${size}B)"
      rm -f "$out"
    fi
  else
    echo "FAIL (curl error)"
    rm -f "$out"
  fi
}

echo "=== Downloading restaurant photos ==="

# welcomekursk.ru (most reliable)
download "gogiya"      "https://welcomekursk.ru/uploads/85b512e585c05a5ef51813ebc1fe792d.jpg"
download "seasons"     "https://welcomekursk.ru/uploads/963b4c81e80e841fd4ab2ff16f089c39.png" "png"
download "mezonin"     "https://welcomekursk.ru/uploads/9a843e584234a1aeb8733de778eaaec3.jpg"
download "ispansky"    "https://welcomekursk.ru/uploads/94d62ae82f628b7346d3d980dd0f0227.jpg"
download "sava"        "https://welcomekursk.ru/uploads/c682af8ee792d5c55f8cb3760f4fcffc.jpg"
download "morskoy-konek" "https://welcomekursk.ru/uploads/593ecbbe1dde636df71ee6d1d4f57d5b.jpg"
download "belaya-akaciya" "https://welcomekursk.ru/uploads/1c2431483c81c284fcec2ee1c3604868.jpg"
download "pivzavod"    "https://welcomekursk.ru/uploads/2cff1b4c2d8c6a2f15206f4487e817c7.jpg"
download "utka"        "https://welcomekursk.ru/uploads/399527825518cc8f659bca95c53d5bd5.jpg"
download "caramel"     "https://welcomekursk.ru/uploads/d8171ecfd48da29d8251172c3eaa2b40.jpg"
download "ferma"       "https://welcomekursk.ru/uploads/c356b10aedf4ba14b8a35721f30ea1cf.jpg"
download "bykovsky"    "https://welcomekursk.ru/uploads/c64465e80a09c789993aca844458bc45.jpg"
download "rivera"      "https://welcomekursk.ru/uploads/7482bc47a9efed2932d03b61e0784ced.jpg"
download "redstone"    "https://welcomekursk.ru/uploads/255d49601057f9cb38c890bef1d98b0c.jpg"
download "kometa"      "https://welcomekursk.ru/uploads/6c46bc5b06eaab9903e31c77b64c5623.jpg"
download "bloom-coffee" "https://welcomekursk.ru/uploads/b0cf0155a29106f7249f9b72c27a8de2.png" "png"
download "kanelo"      "https://welcomekursk.ru/uploads/e85db2468a6b15f7bfaa1f87d3082d3c.jpg"
download "donut-bar"   "https://welcomekursk.ru/uploads/2907ab23bf8f7e73f1f0535545943356.jpg"

# Other sources
download "sei"         "https://static.tildacdn.com/tild3164-6538-4739-b832-346438356461/881.jpg"
download "tbiladzhio"  "https://static.tildacdn.com/tild3332-6639-4633-b534-303632343962/_1.jpg"
download "alt"         "https://p0.zoon.ru/preview/Qd-X5t6lGdGUr8tSBDw80g/2400x1500x75/1/3/9/original_67bde590f83ea68ae903f7e2_67ed41c2dccaa8.77791927.jpg"
download "culture"     "https://gokursk.ru/upload/resize_cache/iblock/f4c/i5luyvypasywgiq3jrpcwlcfp63njrsz/1024_9999_1/Snapinsta.app_405541818_366653409094843_6680340821919578271_n_1080.jpg"
download "introvert"   "https://img02.restaurantguru.ru/c354-Restaurant-Introvert-photo.jpg"
download "papa-lepit"  "https://grinn-kursk.ru/wp-content/uploads/2023/03/ll3ir6dzpic.jpg"
download "kotleta"     "https://make-eat.ru/restiraniy/restoran-kotleta-kursk.jpg"
download "akvamarin"   "https://sun9-41.userapi.com/impg/Eb-d78Bc5MKWwjwFUu0ZOX3YCrOpm80owCGeLQ/Kat567wDsTg.jpg?size=1280x853&quality=95&sign=a314ce18ea1666f9b538da70ce5e5af3&type=album"
download "butylochnaya" "https://butylochnaya.ru/assets/photos/hero.jpg"

echo ""
echo "=== Results ==="
ls -lh "$DIR"/ 2>/dev/null | grep -v "^total" || echo "No files"
echo ""
echo "Done!"
