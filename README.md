# yuki Slide Archive

共有用 html-slide_archive
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
├─ 2026/                   … 年別フォルダ
│  ├─ index.html           … 月別一覧
│  └─ 06/                  … 月別フォルダ
│     ├─ index.html        … スライド一覧
│     └─ slide-name/       … スライド本体(フォルダ単位)
├─ archive/                … 古いもの・一覧から外したものの置き場
│  └─ 2026/06/slide-name/  … アーカイブ済みスライド(年/月/フォルダ単位)
└─ _local/                 … Git管理外のローカル作業置き場
```

## 公開中のスライド例

- きのこ派、勝利宣言:
  https://nirayuki-slides.github.io/slide-archive/2026/06/kinoko-presentation/
- 豆腐入り大判つくね定食(体育会系大学生向けランチ企画):
  https://nirayuki-slides.github.io/slide-archive/archive/2026/06/restricted-lunch/

## 運用ルール

- 新規スライドは必ず `YYYY/MM/slide-name/index.html` の形で置く
- 1スライド = 1フォルダ。画像などの素材も同じフォルダに入れる
- スライドフォルダ名は日本語も使用可能。URLでは自動的にパーセントエンコードされる
- 共有しやすいURLにしたい場合は、半角英小文字・数字・ハイフン区切りを推奨
- リンクはすべて相対パスで書く(ローカル絶対パスや `file:///` を残さない)
- 文字コードはUTF-8(`<meta charset="UTF-8">` を必ず入れる)

## 新しいスライドを追加する手順

1. `YYYY/MM/slide-name/` を作成する
   - 例: `2026/07/my-presentation/`、`2026/07/夏の発表/`
   - 月フォルダ(`YYYY/MM/`)がなければ作る
   - `YYYY/MM/index.html` は自動生成されるので手で作らない
2. 作成したフォルダに `index.html` と必要なCSS/JS/画像を入れる
   - `<title>` と `<meta name="description" content="...">` を入れると一覧のタイトル・説明に使われる
3. 一覧ページを更新する
   - ローカルで確認したい場合は、リポジトリルートで `python tools/generate_indexes.py` を実行する
   - GitHubへpushした場合は GitHub Actions が自動で一覧ページを生成する
4. ローカルで生成した場合は、生成された一覧ページも含めてコミットしてプッシュする
   - 生成せずにpushした場合は、GitHub Actionsが一覧ページ更新のコミットを追加する
5. コミットしてプッシュすると、以下のURLで公開される

   `https://nirayuki-slides.github.io/slide-archive/YYYY/MM/slide-name/`

## 一覧ページの自動生成

`index.html`、`YYYY/index.html`、`YYYY/MM/index.html`、`archive/index.html`、`archive/YYYY/index.html`、`archive/YYYY/MM/index.html` は `tools/generate_indexes.py` で自動生成します。
これらの一覧ページは手で編集せず、フォルダ構成やスライド本体の `<title>` / `<meta name="description">` を変更してから生成スクリプトを実行してください。

スライド本体の `index.html` は必要です。
GitHub Pagesでは `slide-name/` にアクセスしたとき、そのフォルダ内の `index.html` が表示されます。

一覧ページは `assets/css/common.css` のリキッドグラス風デザインを使用します。
ライト/ダークモードは初回表示時にユーザーのOS・ブラウザ設定へ合わせ、画面上の切替ボタンで変更できます。

## 命名ルール

- スライドフォルダ名は日本語・半角英数字・ハイフンを使用可能(例: `school-report`, `plan-share-v2`, `夏の発表`)
- スペースや記号はURL共有時に読みづらくなるため避ける
- 一覧生成時、フォルダ名はリンク用に自動でURLエンコードされる
- 年は4桁(`2026`)、月は2桁(`01`〜`12`)

## archive/ フォルダについて

役目を終えたスライドや、通常一覧から外したいスライドの移動先です。
アーカイブも `archive/YYYY/MM/slide-name/index.html` の形で管理します。
`archive/YYYY/index.html` と `archive/YYYY/MM/index.html` も自動生成されるので手で作りません。
詳細は [archive/README.md](archive/README.md) を参照してください。
**archiveに移しても公開されたままなので、非公開化の手段にはなりません。**

## _local/ フォルダについて

Git管理外のローカル作業置き場です。
PPTX原本、生成プロンプト、作業メモ、履歴削除前のバックアップなど、公開リポジトリに入れないが手元に残したいファイルを置きます。
`.gitignore` で除外されているため、GitHub Pagesには公開されません。

## GitHub Pages公開前提の注意

- このリポジトリの内容はすべてインターネットに公開される
- 個人情報・内部資料・非公開情報は絶対にコミットしない
- 画像・動画など重い素材を大量に入れない(リポジトリが肥大化するため)
- 一度プッシュしたものは履歴に残るため、公開してはいけないものは最初から入れない
