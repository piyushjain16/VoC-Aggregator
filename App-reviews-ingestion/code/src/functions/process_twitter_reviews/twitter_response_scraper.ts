export interface SearchData {
    results:             Result[];
    continuation_token?: string;
}

export interface HashtagData {
    results:             Result[];
    continuation_token?: string;
}
export interface Result {
    tweet_id:              string;
    creation_date:         Date;
    text:                  string;
    media_url:             string[] | null;
    video_url:             string[] | null;
    user:                  User;
    language:              string;
    favorite_count:        number;
    retweet_count:         number;
    reply_count:           number;
    quote_count:           number;
    retweet:               boolean;
    views:                 number;
    timestamp:             number;
    in_reply_to_status_id?:null;
    quoted_status_id?:     null;
    retweet_tweet_id?:     string | null;
    conversation_id:       string;
    retweet_status?:       null;
    quoted_status?:        null;
    bookmark_count:        number;
    source:                string;
    community_note?:       string;
}

export interface User {
    creation_date:         Date;
    user_id:               string;
    username:              string;
    name:                  string;
    follower_count:        number;
    following_count:       number;
    favourites_count:      number;
    is_private?:           boolean;
    is_verified:           boolean;
    is_blue_verified:      boolean;
    location:              string;
    profile_pic_url:       string;
    profile_banner_url:    string;
    description:           string;
    external_url:          null | string;
    number_of_tweets:      number;
    bot:                   boolean;
    timestamp:             number;
    has_nft_avatar:        boolean;
    category:              null;
    default_profile:       boolean;
    default_profile_image: boolean;
    listed_count:          number;
    verified_type:         null;
}
  


export async function getSearchData(search:string,total_count:number,start_date:string): Promise<SearchData> {
    const BaseUrl = `https://twitter154.p.rapidapi.com/search/search?query=%40${search}&section=top&language=en&start_date=${start_date}`;
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': '86beaafd2emsh4f962ba2fba3a91p1d9e8ajsnffc0b42fc873',
            'X-RapidAPI-Host': 'twitter154.p.rapidapi.com'
        }
    };
    let ContinuationToken:string| null|undefined=null;
    let AllResult:Result[]=[];
    try {
        let response_count=0;
        let response_lenght:number=20;
        do{
            let limit=Math.min(20,total_count-response_count);
            if(limit==0) continue;
            let TwitterUrl:string=ContinuationToken?`${BaseUrl}&continuation_token=${ContinuationToken}&limit=${limit}`:`${BaseUrl}&limit=${limit}`;
            let response = await fetch(TwitterUrl, options);
            let result:SearchData = await response.json();
            response_lenght=result.results.length;
            response_count+=response_lenght;
            AllResult=[...AllResult,...result.results];
            ContinuationToken=result.continuation_token; 
        }
        while(total_count>response_count && response_lenght==20)
        const SearchResult:SearchData={
            results:AllResult
        }
        return SearchResult;
    } 
    catch (error) {
    	console.error(error);
        return {results:[]};
    }
}


export async function getHashtagData(hashtag:string,total_count:number): Promise<HashtagData> {
    const BaseUrl = `https://twitter154.p.rapidapi.com/hashtag/hashtag?hashtag=%23${hashtag}`;
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': '86beaafd2emsh4f962ba2fba3a91p1d9e8ajsnffc0b42fc873',
            'X-RapidAPI-Host': 'twitter154.p.rapidapi.com'
        }
    };
    let ContinuationToken:string| null|undefined=null;
    let AllResult:Result[]=[];
    try {
        let response_count=0;
        let response_lenght:number=20;
        do{
            let limit=Math.min(20,total_count-response_count);
            if(limit==0) continue;
            let TwitterUrl:string=ContinuationToken?`${BaseUrl}&continuation_token=${ContinuationToken}&limit=${limit}`:`${BaseUrl}&limit=${limit}`;
            let response = await fetch(TwitterUrl, options);
            let result:HashtagData= await response.json();
            response_lenght=result.results.length;
            response_count+=response_lenght;
            AllResult=[...AllResult,...result.results];
            ContinuationToken=result.continuation_token; 
        }
        while(total_count>response_count && response_lenght==20)
        const HashtagResult:HashtagData={
            results:AllResult
        }
        return HashtagResult;
    } 
    catch (error) {
    	console.error(error);
        return {results:[]};
    }
}

