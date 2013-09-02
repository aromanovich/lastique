git archive --format zip -o "./releases/lastique-$(sed -n 's/^.*"version": "\(.*\)".*$/\1/pg' < manifest.json).zip" HEAD
