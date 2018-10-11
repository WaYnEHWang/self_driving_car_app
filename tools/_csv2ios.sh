#!/bin/sh
# install csvprintf first
lang="en zh-Hant"
index=5

for l in $lang
do
  mkdir -p ios/mod/$l.lproj
  filename="ios/mod/$l.lproj/InfoPlist.strings"
  echo $filename
  cat tools/StringTable.csv | grep __IOS__ | csvprintf -i "%2\$s=\"%$index\$s\";\n" > $filename
  index=$(($index+1))
done
