# Slide Archive

共有用HTMLスライドのアーカイブです。
学校課題・発表・企画共有などで使うHTMLスライドをこのリポジトリに集約します。

- 公開URL: https://nirayuki-slides.github.io/slide-archive/
- GitHub: https://github.com/nirayuki-slides/slide-archive

静的HTML/CSS/JSのみで構成し、GitHub Pagesでそのまま公開します。
React・Vite・npm・外部ライブラリは使いません。

## ディレクトリ構成

```
slide-archive/
├─ index.html              … トップページ
├─ assets/css/common.css   … 共通CSS
├─ templates/simple-slide/ … 新規スライドのコピー元テンプレート
├─ 2026/                   … 年別フォルダ
│  ├─ index.html           … 月別一覧
│  └─ 06/                  … 月別フォルダ
│     ├─ index.html        … スライド一覧
│     └─ sample-slide/     … スライド本体(フォルダ単位)
└─ archive/                … 古いもの・一覧から外したものの置き場
```

## 公開中のスライド例

- きのこ派、勝利宣言:
  https://nirayuki-slides.github.io/slide-archive/2026/06/kinoko-presentation/
- 豆腐入り大判つくね定食(体育会系大学生向けランチ企画):
  https://nirayuki-slides.github.io/slide-archive/2026/06/restricted-lunch/

## 運用ルール

- 新規スライドは必ず `YYYY/MM/slide-name/index.html` の形で置く
- 1スライド = 1フォルダ。画像などの素材も同じフォルダに入れる
- **sample-slide はコピー元・確認用のサンプル。本番スライドを `sample-slide/` の中に入れない**
- フォルダ名は小文字英数字・ハイフン区切りを推奨(URLになるため日本語・空白・大文字は使わない)
- リンクはすべて相対パスで書く(ローカル絶対パスや `file:///` を残さない)
- 文字コードはUTF-8(`<meta charset="UTF-8">` を必ず入れる)

## 新しいスライドを追加する手順

1. `templates/simple-slide/` を `YYYY/MM/slide-name/` にコピーする
   - 例: `2026/07/my-presentation/`
   - 月フォルダ(`YYYY/MM/`)がなければ作り、`index.html` も用意する
     (既存の月フォルダの `index.html` をコピーして書き換えると早い)
2. コピーした `index.html` の `★ここを書き換える` 部分を書き換える
3. 月別一覧ページ `YYYY/MM/index.html` にリンクを追加する
4. 新しい月を作った場合は、年別一覧ページ `YYYY/index.html` にもリンクを追加する
5. コミットしてプッシュすると、以下のURLで公開される

   `https://nirayuki-slides.github.io/slide-archive/YYYY/MM/slide-name/`

## 命名ルール

- フォルダ名は半角英小文字・数字・ハイフンのみ(例: `school-report`, `plan-share-v2`)
- 日本語・スペース・大文字はフォルダ名に使わない(URLになるため)
- 年は4桁(`2026`)、月は2桁(`01`〜`12`)

## archive/ フォルダについて

役目を終えたスライドや、通常一覧から外したいスライドの移動先です。
詳細は [archive/README.md](archive/README.md) を参照してください。
**archiveに移しても公開されたままなので、非公開化の手段にはなりません。**

## GitHub Pages公開前提の注意

- このリポジトリの内容はすべてインターネットに公開される
- 個人情報・内部資料・非公開情報は絶対にコミットしない
- 画像・動画など重い素材を大量に入れない(リポジトリが肥大化するため)
- 一度プッシュしたものは履歴に残るため、公開してはいけないものは最初から入れない
