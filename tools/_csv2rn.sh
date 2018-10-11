#!/bin/bash
# install csvprintf first
lang="zh-TW"
index=6

function gen_translate() {
  filename="l10n/$1.js"
  echo $filename
  echo "module.exports = {" > $filename
  cat tools/StringTable.csv | grep __ReactNative__ | csvprintf -i "  %2\$s: \"%$2\$s\",\n" >> $filename
  echo "};" >> $filename
}

for l in $lang
do
  gen_translate $l $index &
  index=$(($index+1))
done

# Pause for child ending
for job in `jobs -p`
do
  wait $job
done
