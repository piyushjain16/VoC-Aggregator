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



// import {publicSDK } from '@devrev/typescript-sdk';
// import {
//     getHashtagData,
//     getSearchData,
//     Result,
// } from './twitter_response_scraper';
// import { ApiUtils, HTTPResponse } from './utils';
// import {LLMUtils} from './llm_utils';

// export const run = async (events: any[]) => {
//   for (const event of events) {
//     const endpoint: string = event.execution_metadata.devrev_endpoint;
//     const token: string = event.context.secrets.service_account_token;
//     const fireWorksApiKey: string = event.input_data.keyrings.fireworks_api_key;
//     const twitterApiKey: string = event.input_data.keyrings.twitter_api_key;
//     const apiUtil: ApiUtils = new ApiUtils(endpoint, token);
//     // Get the number of reviews to fetch from command args.
//     const snapInId = event.context.snap_in_id;
//     const devrevPAT = event.context.secrets.service_account_token;
//     const baseURL = event.execution_metadata.devrev_endpoint;
//     const inputs = event.input_data.global_values;
//     let parameters:string = event.payload.parameters.trim();
//     const tags = event.input_data.resources.tags;
//     const llmUtil: LLMUtils = new LLMUtils(fireWorksApiKey, `accounts/fireworks/models/${inputs['llm_model_to_use']}`, 200);
//     const minReviewSize:number=3;
//     let numReviews = 10;
//     let commentID : string | undefined;
//     if (parameters === 'help') {
//       // Send a help message in CLI help format.
//       const helpMessage = `Twitter_reviews_process - Fetch reviews from Twitter and create tickets in DevRev.\n\nUsage: /twitter_reviews_process <number_of_reviews_to_fetch>\n\n\`number_of_reviews_to_fetch\`: Number of reviews to fetch from Twitter. Should be a number between 1 and 100. If not specified, it defaults to 10.`;
//       let postResp  = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, helpMessage, 1);
//       if (!postResp.success) {
//         console.error(`Error while creating timeline entry: ${postResp.message}`);
//         continue;
//       }
//       continue
//     }
//     let postResp: HTTPResponse = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, 'Fetching reviews from Twitter', 1);
//     if (!postResp.success) {
//       console.error(`Error while creating timeline entry: ${postResp.message}`);
//       continue;
//     }
//     if (!parameters) {
//       // Default to 10 reviews.
//       parameters = '10';
//     }
//     try {
//       numReviews = parseInt(parameters);

//       if (!Number.isInteger(numReviews)) {
//         throw new Error('Not a valid number');
//       }
//     } catch (err) {
//       postResp  = await apiUtil.postTextMessage(snapInId, 'Please enter a valid number', commentID);
//       if (!postResp.success) {
//         console.error(`Error while creating timeline entry: ${postResp.message}`);
//         continue;
//       }
//       commentID = postResp.data.timeline_entry.id;
//     }
//     // Make sure number of reviews is <= 100.
//     if (numReviews > 100) {
//       postResp  = await apiUtil.postTextMessage(snapInId, 'Please enter a number less than 100', commentID);
//       if (!postResp.success) {
//         console.error(`Error while creating timeline entry: ${postResp.message}`);
//         continue;
//       }
//       commentID = postResp.data.timeline_entry.id;
//     }
//     // Call twitter scraper to fetch those number of reviews.
//     const Hashtag:string='blinkitsupport';
//     let getReviewsResponse:any = await getHashtagData(Hashtag,numReviews);
//     // Post an update about the number of reviews fetched.
//     postResp  = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, `Fetched ${numReviews} reviews, creating tickets now.`, 1);
//     if (!postResp.success) {
//       console.error(`Error while creating timeline entry: ${postResp.message}`);
//       continue;
//     }
//     commentID = postResp.data.timeline_entry.id;
//     let reviews:Result[] = getReviewsResponse.results;
//     // For each review, create a ticket in DevRev.
//     for(const review of reviews) {
//       // Post a progress message saying creating ticket for review with review URL posted.
//       postResp  = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, `Creating ticket for review: ${review.tweet_id}`, 1);
//       if (!postResp.success) {
//         console.error(`Error while creating timeline entry: ${postResp.message}`);
//         continue;
//       }
//       const reviewText = `Ticket created from Twitter review ${review.tweet_id}\n\n${review.text}`;
//       const reviewTitle = `Ticket created from Twitter review ${review.tweet_id}`;
//       const reviewID = review.tweet_id;
//       const reviewVote=review.favorite_count;
//       let reviewSeverity: publicSDK.TicketSeverity;
//       if (reviewVote<10){
//         reviewSeverity=publicSDK.TicketSeverity.Low;
//       }
//       else if(reviewVote<100){
//         reviewSeverity=publicSDK.TicketSeverity.Medium;
//       }
//       else{
//         reviewSeverity=publicSDK.TicketSeverity.High;
//       }
//       const systemPrompt = `You are an expert at labelling a given Google Play Store Review as bug, feature_request, question or feedback. You are given a review provided by a user for the app ${inputs['app_id']}. You have to label the review as bug, feature_request, question or feedback. The output should be a JSON with fields "category" and "reason". The "category" field should be one of "bug", "feature_request", "question" or "feedback". The "reason" field should be a string explaining the reason for the category. \n\nReview: {review}\n\nOutput:`;
//       const humanPrompt = ``;

//       let llmResponse = {};
//       try {
//         llmResponse = await llmUtil.chatCompletion(systemPrompt, humanPrompt, {review: (reviewTitle ? reviewTitle + '\n' + reviewText: reviewText)})
//       } catch (err) {
//         console.error(`Error while calling LLM: ${err}`);
//       }
//       let tagsToApply = [];
//       let inferredCategory = 'failed_to_infer_category';
//       if ('category' in llmResponse) {
//         inferredCategory = llmResponse['category'] as string;
//         if (!(inferredCategory in tags)) {
//           inferredCategory = 'failed_to_infer_category';
//         }
//       }
//       // Create a ticket with title as review title and description as review text.
//       const createTicketResp = await apiUtil.createTicket({
//         title: reviewTitle,
//         tags: [{id: tags[inferredCategory].id}],
//         body: reviewText,
//         type: publicSDK.WorkType.Ticket,
//         owned_by: [inputs['default_owner_id']],
//         applies_to_part: inputs['default_part_id'],
//         severity:reviewSeverity, 
//       });
//       if (!createTicketResp.success) {
//         console.error(`Error while creating ticket: ${createTicketResp.message}`);
//         continue;
//       }
//       // Post a message with ticket ID.
//       const ticketID = createTicketResp.data.work.id;
//       const ticketCreatedMessage = inferredCategory != 'failed_to_infer_category' ? `Created ticket: <${ticketID}> and it is categorized as ${inferredCategory}` : `Created ticket: <${ticketID}> and it failed to be categorized`;
//       const postTicketResp: HTTPResponse  = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, ticketCreatedMessage, 1);
//       if (!postTicketResp.success) {
//         console.error(`Error while creating timeline entry: ${postTicketResp.message}`);
//         continue;
//       }
//       // Create a issue with title as review title and description as review text.
//       const createIssueResp = await apiUtil.createIssue({
//         title: reviewTitle,
//         tags: [{id: tags[inferredCategory].id}],
//         body: reviewText,
//         type: publicSDK.WorkType.Issue,
//         owned_by: [inputs['default_owner_id']],
//         applies_to_part: inputs['default_part_id'],
//         priority:publicSDK.IssuePriority.P1,
//       });
//       if (!createIssueResp.success) {
//         console.error(`Error while creating Issue: ${createIssueResp.message}`);
//         continue;
//       }
//       // Post a message with Issue ID.
//       const issueID = createIssueResp.data.work.id;
//       const issueCreatedMessage = inferredCategory != 'failed_to_infer_category' ? `Created issue: <${issueID}> and it is categorized as ${inferredCategory}` : `Created issue: <${issueID}> and it failed to be categorized`;
//       const postIssueResp: HTTPResponse  = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, issueCreatedMessage, 1);
//       if (!postIssueResp.success) {
//         console.error(`Error while creating timeline entry: ${postIssueResp.message}`);
//         continue;
//       }
//     }
//     // Call an LLM to categorize the review as Bug, Feature request, or Question.
//   }
// };

// export default run;




