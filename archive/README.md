# archive/

古いスライドや、通常の一覧(年別・月別ページ)から外したスライドの置き場です。
ここでも1スライド = 1フォルダとして扱い、`archive/YYYY/MM/slide-name/index.html` の形で置きます。

## 運用ルール

- 役目を終えたスライドは、`YYYY/MM/slide-name/` から `archive/YYYY/MM/slide-name/` へフォルダごと移動する
- スライドフォルダ名は日本語も使用可能。共有しやすいURLにしたい場合は半角英小文字・数字・ハイフンを推奨
- `archive/YYYY/index.html` と `archive/YYYY/MM/index.html` は自動生成されるので手で作らない
- 移動したら、リポジトリルートで `python tools/generate_indexes.py` を実行して一覧ページを再生成する
- GitHubへpushした場合は、GitHub Actionsでも一覧ページが自動生成される
- `archive/index.html`、`archive/YYYY/index.html`、`archive/YYYY/MM/index.html` は自動生成対象なので手で編集しない

## 注意

**このフォルダもGitHub Pagesで公開される可能性があります。**
「アーカイブ = 非公開」ではありません。
非公開情報・個人情報・内部資料は絶対に置かないでください。
公開したくないものはリポジトリ自体から削除してください。
