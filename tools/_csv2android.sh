#!/bin/sh
# install csvprintf first
lang="zh-TW"
index=6

lang=`echo $lang | sed -E 's/-/-r/g'`
for l in $lang
do
  mkdir -p android/app/src/main/res/values-$l
  filename="android/app/src/main/res/values-$l/strings.xml"
  echo $filename
  echo "<resources>" > $filename
  cat tools/StringTable.csv | grep __Android__ | csvprintf -i "    <string name=\"%2\$s\">\"%$index\$s\"</string>\n" >> $filename
  echo "</resources>" >> $filename
  index=$(($index+1))
done
