// 紹介カードの中身 (Agent C) — やさしい絵本調
// photos: assets/ui/photos/*.webp は image_search (CC / Public Domain フィルタ) で取得し 960x720 に整形
export const ORDER = ['lighthouse', 'windmill', 'flowers', 'waterfall', 'balloon'];

export const CONTENT = {
  lighthouse: {
    name: '灯台', kana: 'とうだい', en: 'Lighthouse',
    color: '#FF9F7A', tint: '#FFE6DA', icon: 'lighthouse',
    lead: '雲の海で まいごに ならないように、まいばん ひかりを くるりと まわす 島の みはりばん。',
    body: [
      'しろと あかの しましまは、とおくの 雲の あいだからでも 見つけやすい いろ。風の つよい日も、灯台は せすじを ぴんと のばして 立っています。',
      'てっぺんの ランプは ゆっくり ひとまわり。ひかりが とどく ところまでが、この 島の 「おうちの ちかく」です。',
    ],
    facts: [
      { k: 'たかさ', v: '雲 3つぶん' },
      { k: 'ひかりの まわる はやさ', v: 'ひとまわり 8びょう' },
      { k: 'すきなもの', v: 'かもめの あいさつ' },
    ],
    trivia: 'ほんものの 灯台も、場所ごとに ひかりかたの リズムが ちがいます。船の ひとは リズムで 「どこの 灯台か」を 見わけるんだって。',
    photos: [
      { src: 'assets/ui/photos/lighthouse1.webp', alt: 'あおぞらと しましまの 灯台', credit: 'PxHere (CC0)', url: 'https://pxhere.com/en/photo/1262530' },
      { src: 'assets/ui/photos/lighthouse2.webp', alt: 'うみに たつ あかしろの 灯台', credit: 'Public Domain Pictures (CC0)', url: 'https://www.publicdomainpictures.net/en/view-image.php?image=305930' },
    ],
  },
  windmill: {
    name: '風車', kana: 'ふうしゃ', en: 'Windmill',
    color: '#8FB8FF', tint: '#E3EDFF', icon: 'windmill',
    lead: 'くるくる まわる 4まいの はね。島に ふく 風を あつめて、ちいさな パンやさんの こむぎを ひいています。',
    body: [
      '風が かわると、風車は あたまを くるりと むけて 風の くる ほうを 見ます。風と なかよしで いるのが いちばんの しごと。',
      'はねが まわる おとは 「ことん、ことん」。島の みんなは この おとで おひるの じかんを しるのです。',
    ],
    facts: [
      { k: 'はねの かず', v: '4まい' },
      { k: 'いちにちに ひく こむぎ', v: 'パン 120こぶん' },
      { k: 'にがてなもの', v: '風の ない日' },
    ],
    trivia: 'オランダには いまも 1000きいじょうの 風車が のこっていて、ふるい ものは 300ねん いじょう まわりつづけて いるんですよ。',
    photos: [
      { src: 'assets/ui/photos/windmill1.webp', alt: 'はなばたけの むこうの 風車', credit: 'PxHere (CC0)', url: 'https://pxhere.com/en/photo/1434887' },
      { src: 'assets/ui/photos/windmill2.webp', alt: 'あおぞらの 風車小屋', credit: 'Needpix (CC0)', url: 'https://www.needpix.com/photo/416146/windmill-netherlands-garden' },
    ],
  },
  flowers: {
    name: '花畑', kana: 'はなばたけ', en: 'Flower Field',
    color: '#FFB3C7', tint: '#FFE8EF', icon: 'flower',
    lead: 'ピンク、きいろ、しろ、むらさき。数えきれない 花が、風に あわせて いっせいに おじぎを します。',
    body: [
      '花びらが ひらりと まいあがると、それは 「こんにちは」の あいず。ちょうちょたちが すぐに あつまって きます。',
      'この 花畑の 花は、雲から ふる ちいさな あめと、たっぷりの おひさまで そだちました。',
    ],
    facts: [
      { k: '花の かず', v: 'かぞえて いる とちゅう' },
      { k: 'よく くる おきゃくさん', v: 'ちょうちょ・みつばち' },
      { k: 'いちばん にぎやかな じかん', v: 'あさの 10じ' },
    ],
    trivia: 'みつばちは 花の いろを 人間とは ちがう 見えかたで 見ています。紫外線で 花の まんなかに 「ここだよ」の もようが 見えるんだって。',
    photos: [
      { src: 'assets/ui/photos/flowers2.webp', alt: 'あおぞらの したの 野の花', credit: 'Public Domain Pictures (CC0)', url: 'https://www.publicdomainpictures.net/en/view-image.php?image=205071' },
      { src: 'assets/ui/photos/flowers1.webp', alt: 'あかと きいろの 花', credit: 'Pixnio (CC0)', url: 'https://pixnio.com/media/bright-colorful-meadow-wildflower-flower' },
    ],
  },
  waterfall: {
    name: '滝', kana: 'たき', en: 'Waterfall',
    color: '#7FD3E8', tint: '#DDF5FB', icon: 'drop',
    lead: '島の はしっこから、きらきらの 水が 雲の 海へ まっさかさま。しぶきの なかには ちいさな にじが かかります。',
    body: [
      'おちた 水は 雲に なって、また 島に あめを ふらせます。だから この 滝は いつまでも かれないのです。',
      'よく 見ると、しぶきが おひさまの ひかりで 七いろに ひかる しゅんかんが あります。見つけられたら ラッキー。',
    ],
    facts: [
      { k: 'おちる たかさ', v: 'まだ だれも はかれない' },
      { k: 'にじが でやすい じかん', v: 'おひさまが せなかに あるとき' },
      { k: 'みずの つめたさ', v: 'ひんやり きもちいい' },
    ],
    trivia: 'にじは 「おひさまを せなかに して、水しぶきの ほうを 見る」と 見つかります。ひかりが 水の つぶの なかで まがって 七いろに わかれるからです。',
    photos: [
      { src: 'assets/ui/photos/waterfall1.webp', alt: 'みどりの がけを おちる 滝と にじ', credit: 'PxHere (CC0)', url: 'https://pxhere.com/en/photo/108672' },
      { src: 'assets/ui/photos/waterfall2.webp', alt: 'もりの なかの 滝', credit: 'Public Domain Pictures (CC0)', url: 'https://www.publicdomainpictures.net/en/view-image.php?image=10595' },
    ],
  },
  balloon: {
    name: '気球', kana: 'ききゅう', en: 'Hot-air Balloon',
    color: '#FFD36E', tint: '#FFF4D6', icon: 'balloon',
    lead: 'ふわり、ふわり。島と 島の あいだを ゆっくり さんぽする、空の のりもの。',
    body: [
      'あたたかい 空気を すいこんで、気球は かるく なって うかびます。いきさきは 風まかせ。きょうは どの 島まで いけるかな。',
      'バスケットの なかには、おべんとうと そうがんきょう。上から 見ると、島の かたちが ハートに 見える ところが あるそうです。',
    ],
    facts: [
      { k: 'のれる ひと', v: '4にん と ねこ 1ぴき' },
      { k: 'いちばん たかく とんだ きろく', v: 'お月さまの ちょっと した' },
      { k: 'すきな 風', v: 'あさの そよかぜ' },
    ],
    trivia: 'さいしょに 人を のせて とんだ 熱気球は 1783ねん、フランスの モンゴルフィエ きょうだいが つくりました。',
    photos: [
      { src: 'assets/ui/photos/balloon1.webp', alt: 'あおぞらに うかぶ カラフルな 気球', credit: 'Public Domain Pictures (CC0)', url: 'https://www.publicdomainpictures.net/en/view-image.php?image=139186' },
      { src: 'assets/ui/photos/balloon2.webp', alt: 'たくさんの 気球', credit: 'PxHere (CC0)', url: 'https://pxhere.com/en/photo/80149' },
    ],
  },
};

export const HINTS = [
  { icon: 'drag', text: 'ゆびで なぞって 島を ぐるり' },
  { icon: 'pinch', text: '2本ゆびで ひろげて ちかくへ' },
  { icon: 'tap', text: 'ピンや たてものを タップすると おはなしが ひらくよ' },
];

export const SITE = {
  title: 'NANKA', subtitle: '空にうかぶ島',
  welcome: 'ようこそ、空の 島へ。5つの ふしぎを さがしてみよう。',
  allFound: 'ぜんぶ 見つけたね！ この 島の ともだちに なりました。',
};
