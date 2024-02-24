// const url = 'https://twitter154.p.rapidapi.com/hashtag/hashtag?hashtag=%23python&limit=20&section=top';
// const options = {
// 	method: 'GET',
// 	headers: {
// 		'X-RapidAPI-Key': '86beaafd2emsh4f962ba2fba3a91p1d9e8ajsnffc0b42fc873',
// 		'X-RapidAPI-Host': 'twitter154.p.rapidapi.com'
// 	}
// };

// try {
// 	const response = await fetch(url, options);
// 	const result = await response.text();
// 	console.log(result);
// } catch (error) {
// 	console.error(error);
// }
// const message:string = "hello world!";
// console.log(message);

// interface HashtagData {
//     result : Array<TweetData>
// }

// interface TweetData {
//       tweet_id: number
//       creation_date: Date,
//       text: string,
//       media_url?: string,
//       video_url?: string,
//       user: {
//         creation_date: Date,
//         user_id: number,
//         username: string,
//         name: string,
//         follower_count: number,
//         following_count: number,
//         is_private: boolean,
//         is_verified: boolean,
//         location: string,
//         profile_pic_url: string,
//         description: string,
//         external_url: string,
//         number_of_tweets: number,
//         bot: boolean,
//         timestamp: Date
//       },
//       language: string,
//       favorite_count: number,
//       retweet_count: number,
//       reply_count: number,
//       quote_count: number,
//       retweet: boolean,
//       timestamp: Date,
//       video_view_count?: number
// }

// async function getHashtagData(): Promise<HashtagData> {
// 	// API call will go here.
//     const url = 'https://twitter154.p.rapidapi.com/hashtag/hashtag?hashtag=%23python&limit=1';
//     const options = {
//     	method: 'GET',
//     	headers: {
//     		'X-RapidAPI-Key': '86beaafd2emsh4f962ba2fba3a91p1d9e8ajsnffc0b42fc873',
//     		'X-RapidAPI-Host': 'twitter154.p.rapidapi.com'
//     	}
//     };
//     try {
//         const response = await fetch(url, options);
//     	// const result = await response.text();
//         const result:HashtagData  = await response.json();
//     	console.log(result);
//         return result;
//     } 
//     catch (error) {
//     	console.error(error);
//         return {result:[]};
//     }
// }
// getHashtagData()