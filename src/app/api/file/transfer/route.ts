import { prisma } from '@/lib/prisma';
import {  manualTransfer } from '@/lib/transfer';
import { TransferMethod, TransferStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
    // {
    //   id: 'chijoheaven:CJOD-452',
    //   number: 'CJOD-452',
    //   title: 'エッチな清楚アイドルが痴女ってくる中出しOK回春アジアンメンズエステ 逢沢みゆ',
    //   summary: 'エッチな元正統派アイドルがあの手この手でヌイてくれる回春エステ！鼠径部オイルマッサージ手コキ！ゾクゾク囁き密着耳舐め＆チクシャ！拘束＆目隠しで膣内施術セックス！ヌルヌル泡洗体手コキ！追撃男潮もサービス！見つめてベロキスじゅっぽりフェラ！美脚踏み踏み足コキ！膣締め中出し搾精騎乗位！大ボリューム7コーナー12射精でヌキどころバツグン！エロくて芸能人級にカワイイお姉さんが手抜き無し積極プレイ！S級ルックスお姉さんの徹底的なスケベプレイが見られるのはここだけです！',
    //   provider: 'AVBASE',
    //   homepage: 'https://www.avbase.net/works/chijoheaven:CJOD-452',
    //   director: '大崎広浩治',
    //   actors: [ '逢沢みゆ' ],
    //   thumb_url: 'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/cjod00452/cjod00452ps.jpg',
    //   big_thumb_url: 'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/cjod00452/cjod00452ps.jpg',
    //   cover_url: 'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/cjod00452/cjod00452pl.jpg',
    //   big_cover_url: '',
    //   preview_video_url: 'https://cc3001.dmm.co.jp/litevideo/freepv/c/cjo/cjod00452/cjod00452hhb.mp4',
    //   preview_video_hls_url: '',
    //   preview_images: [
    //     'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/cjod00452/cjod00452jp-1.jpg',
    //     'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/cjod00452/cjod00452jp-2.jpg',
    //     'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/cjod00452/cjod00452jp-3.jpg',
    //     'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/cjod00452/cjod00452jp-4.jpg',
    //     'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/cjod00452/cjod00452jp-5.jpg',
    //     'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/cjod00452/cjod00452jp-6.jpg',
    //     'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/cjod00452/cjod00452jp-7.jpg',
    //     'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/cjod00452/cjod00452jp-8.jpg',
    //     'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/cjod00452/cjod00452jp-9.jpg',
    //     'https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/cjod00452/cjod00452jp-10.jpg'
    //   ],
    //   maker: '痴女ヘブン',
    //   label: '痴女ヘブン',
    //   series: '回春アジアンメンズエステ',
    //   genres: [ 'エステ', '手コキ', '単体作品', '騎乗位', '中出し', '痴女', '独占配信', '4K', 'ハイビジョン' ],
    //   score: 4.7368,
    //   runtime: 155,
    //   release_date: '2025-01-24T00:00:00Z'
    // }
 
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, name, transferMethod } = body;
    const filePath = file.id;
    const fileName = file.name;
    try {
      const fileTransfer = await prisma.fileTransferLog.create({
        data: {
          title: fileName,
          number: null,
          sourcePath: filePath,
          destinationPath: '',
          status: TransferStatus.PROCESSING,
          transferMethod: transferMethod.toUpperCase() as TransferMethod,
        },
      });
      manualTransfer({ file: { id: filePath, name: fileName }, number: name, transferMethod: transferMethod, fileTransferLogId: fileTransfer.id });
      return NextResponse.json({ success: true }, { status: 200 });
      // const searchResults = await metatubeClient.searchByNumber(name);
      // console.log(searchResults);

      // if (searchResults.length > 0) {
      //   const movieDetail = await metatubeClient.getDetails(searchResults[0].provider, searchResults[0].id);
      //   console.log(movieDetail);
      //   const nfoData = mapMovieDetailToNFO(movieDetail);
      //   const nfoGenerator = new NfoGenerator(nfoData);

      //   const xmlContent = nfoGenerator.generateXml();
      //   fs.writeFile('./nfo.xml', xmlContent);
      // }
    } catch (error: any) {
      console.log(error);
      
      return NextResponse.json({ success: false, error: error.message || '搜索时发生服务器内部错误。' }, { status: 500 });
    }
    // return NextResponse.json({ success: false, error: error }, { status: 500 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}
