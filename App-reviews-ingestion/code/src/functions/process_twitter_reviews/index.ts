import {publicSDK } from '@devrev/typescript-sdk';
import {
    getHashtagData,
    getSearchData,
    Result,
} from './twitter_response_scraper';
import { ApiUtils, HTTPResponse ,UniqueReviewData} from './utils';
import {LLMUtils} from './llm_utils';

export const run = async (events: any[]) => {
  for (const event of events) {
    const endpoint: string = event.execution_metadata.devrev_endpoint;
    const token: string = event.context.secrets.service_account_token;
    const openaiApiKey: string = event.input_data.keyrings.openai_api_key;
    const twitterApiKey: string = event.input_data.keyrings.twitter_api_key;
    const apiUtil: ApiUtils = new ApiUtils(endpoint, token);
    // Get the number of reviews to fetch from command args.
    const snapInId = event.context.snap_in_id;
    const devrevPAT = event.context.secrets.service_account_token;
    const baseURL = event.execution_metadata.devrev_endpoint;
    const inputs = event.input_data.global_values;
    let parameters:string = event.payload.parameters.trim();
    const tags = event.input_data.resources.tags;
    const llmUtil: LLMUtils = new LLMUtils(openaiApiKey, `gpt-3.5-turbo-0125`, 200);
    const minReviewSize:number=3;
    let numReviews = 10;
    let commentID : string | undefined;
    if (parameters === 'help') {
      // Send a help message in CLI help format.
      const helpMessage = `Twitter_reviews_process - Fetch reviews from Twitter and create tickets in DevRev.\n\nUsage: /twitter_reviews_process <hashtag/search> <item_to_search> <number_of_reviews_to_fetch>\n\n\`number_of_reviews_to_fetch\`: Number of reviews to fetch from Twitter. Should be a number between 1 and 100. If not specified, it defaults to search blinkiteng 10.`;
      let postResp  = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, helpMessage, 1);
      if (!postResp.success) {
        console.error(`Error while creating timeline entry: ${postResp.message}`);
        continue;
      }
      continue
    }
    let postResp: HTTPResponse = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, 'Fetching reviews from Twitter', 1);
    if (!postResp.success) {
      console.error(`Error while creating timeline entry: ${postResp.message}`);
      continue;
    }
    if (!parameters) {
      // Default to 10 reviews.
      parameters = 'search blinkiteng 10';
    }
    let parameter=parameters.split(" ",3);
    try {
      numReviews = parseInt(parameter[2]);
      if (!Number.isInteger(numReviews)) {
        throw new Error('Not a valid number');
      }
    } catch (err) {
      postResp  = await apiUtil.postTextMessage(snapInId, 'Please enter a valid number', commentID);
      if (!postResp.success) {
        console.error(`Error while creating timeline entry: ${postResp.message}`);
        continue;
      }
      commentID = postResp.data.timeline_entry.id;
    }
    // Make sure number of reviews is <= 100.
    if (numReviews > 100) {
      postResp  = await apiUtil.postTextMessage(snapInId, 'Please enter a number less than 100', commentID);
      if (!postResp.success) {
        console.error(`Error while creating timeline entry: ${postResp.message}`);
        continue;
      }
      commentID = postResp.data.timeline_entry.id;
    }
    let getReviewsResponse:any;
    if (parameter[0]=='hashtag'){
      // Call twitter scraper to fetch those number of reviews.
      const Hashtag:string=parameter[1];
      getReviewsResponse = await getHashtagData(Hashtag,numReviews);
    }
    else if (parameter[0]=='search'){
      // Call twitter scraper to fetch those number of reviews.
      const searchtweet:string=parameter[1];
      getReviewsResponse= await getSearchData(searchtweet,numReviews,'2022-01-01');
    }
    // Post an update about the number of reviews fetched.
    postResp  = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, `Fetched ${numReviews} reviews, creating tickets now.`, 1);
    if (!postResp.success) {
      console.error(`Error while creating timeline entry: ${postResp.message}`);
      continue;
    }
    commentID = postResp.data.timeline_entry.id;
    let reviews:Result[] = getReviewsResponse.results;

    let unique_reviews:string[]=[];
    let unique_reviews_data:UniqueReviewData={reviewdata:[]};
    // process each review . clustering the reviews and generating tickets and issues .
    for(const review of reviews) {
      // removing short reviews
      if(review.text.length<=minReviewSize){
        continue;
      }
      const reviewText = `Ticket created from Twitter review ${review.tweet_id}\n\n${review.text}`;
      const reviewTitle = `Ticket created from Twitter review ${review.tweet_id}`;
      const reviewID = review.tweet_id;
      const reviewUrl="https://twitter.com/"+review.user.username+"/status/"+reviewID;
      const reviewVote=review.favorite_count;
      // remove meaningless reviews
      let systemPrompt = `You are an expert at classifying a given App Review as relevant or irrelevant.You are given a review provided by a user for the app ${inputs['app_name']}.Any review related to customer service,app service,complain, feedback,question,bug,issue should be classified as relevant .You have to label the review as true if it is relevant or false if it is irrelevant. The output should be a JSON with fields "relevance" and "reason". The "relevance" field should be one of "true" or "false". The "reason" field should be a string explaining the reason for the relevance. \n\nReview: {review}\n\nOutput:`;
      let humanPrompt = ``;
      let llmResponse = {};
      let relevant:boolean = true;
      try {
        llmResponse = await llmUtil.chatCompletion(systemPrompt, humanPrompt, {review: review.text});
      } catch (err) {
        console.error(`Error while calling LLM: ${err}`);
      }
      if ('relevance' in llmResponse) {
        relevant= (llmResponse['relevance']==="true") as boolean;
        if (!relevant) {
          continue;
        }
      }
      
      //check duplicate reviews
      systemPrompt = `You are an expert at classifying a given App Review as duplicate or unique. You are given a review provided by a user for the app ${inputs['app_name']} and a list containing previous reviews from the database. Your task is to label the review as duplicate if its context matches with any past review from the database, or false if it has a unique context.

      Instructions:
      
      1. Analyze the given review and compare its context with each past reviews .
      2. If the context of the given review matches with any past review, label it as a duplicate.
      3. If the context is unique and does not match with any past review, label it as false.
      
      Provide a JSON with the following fields:
      
      "is_duplicate": "true" or "false" based on whether the review is a duplicate or not.
      "match_with": If "is_duplicate" is true, provide the index of the past review it matches with. If false, provide -1.
      
      Past Reviews:{past_reviews}
      
      Given Review:{review}
      
      Output:`;

      humanPrompt = ``;
      llmResponse = {};
      let is_duplicate:boolean = false;
      try {
        llmResponse = await llmUtil.chatCompletion(systemPrompt, humanPrompt, {past_reviews:unique_reviews,review: review.text}); 
      } catch (err) {
        console.error(`Error while calling LLM: ${err}`);
      }
      if ('is_duplicate' in llmResponse) {
        is_duplicate= (llmResponse['is_duplicate']==="true") as boolean;
        if (is_duplicate) {
          if ('match_with' in llmResponse){
            let index:number=parseInt(llmResponse['match_with'] as string);
            if (index>=0 && index<unique_reviews_data.reviewdata.length){
              unique_reviews_data.reviewdata[index].totalreviews++;
              unique_reviews_data.reviewdata[index].totalvotes+=reviewVote;
            }
          }
          continue;
        }
      }
      //genrate title and gist of reviews
      systemPrompt = `You are an expert at summarizing a given App Review in title and summary. You are provided with a review for the app ${inputs['app_name']}. Your goal is to generate a concise title for the review and a summary that includes essential information only. The output should be a JSON with fields "title" and "summary".

      Instructions:
      
      1. The title should succinctly describe the main topic or issue raised in the review.
      2. The summary should include relevant information only, removing any irrelevant parts, emojis, punctuation, or lines describing the writer's sentiment.
      3. Use either second-person perspective (like a customer addressing the product designer) or first-person perspective in the summary.
      
      Review:{review}
      
      Output:`
      humanPrompt = ``;
      llmResponse = {};
      let review_title:string='';
      let review_summary:string='';
      try {
        llmResponse = await llmUtil.chatCompletion(systemPrompt, humanPrompt, {review: reviewText});
      } catch (err) {
        console.error(`Error while calling LLM: ${err}`);
      }
      if ('title' in llmResponse) {
        review_title= llmResponse['title'] as string;
      }
      if ('summary' in llmResponse){
        review_summary=llmResponse['summary'] as string;
      }
      // tagging the review.
      systemPrompt = `You are an expert at labelling a given App Review as bug, feature_request, question,logistics_experience, positive_feedback or negative_feedback. You are given a review provided by a user for the app ${inputs['app_name']}. You have to label the review as bug, feature_request, question, logistics_experience, positive_feedback or negative_feedback. The output should be a JSON with fields "category" and "reason". The "category" field should be one of "bug", "feature_request", "question", "logistics_experience", "positive_feedback" or "negative_feedback". The "reason" field should be a string explaining the reason for the category. \n\nReview: {review}\n\nOutput:`;
      humanPrompt = ``;
      llmResponse = {};
      try {
        llmResponse = await llmUtil.chatCompletion(systemPrompt, humanPrompt, {review:reviewText})
      } catch (err) {
        console.error(`Error while calling LLM: ${err}`);
      }
      let inferredCategory = 'failed_to_infer_category';
      if ('category' in llmResponse) {
        inferredCategory = llmResponse['category'] as string;
        if (!(inferredCategory in tags)) {
          inferredCategory = 'failed_to_infer_category';
        }
      }
      unique_reviews.push(review_summary);
      unique_reviews_data.reviewdata.push({
        review:review_summary,
        totalvotes:reviewVote,
        totalreviews:1
      })

      // Post a progress message saying creating ticket for review with review URL posted.
      postResp  = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, `Creating ticket for review: ${reviewID}`, 1);
      if (!postResp.success) {
        console.error(`Error while creating timeline entry: ${postResp.message}`);
        continue;
      }
      let reviewSeverity:publicSDK.TicketSeverity;
      if(inferredCategory=='positive_feedback'){
        reviewSeverity=publicSDK.TicketSeverity.Blocker;
      }
      else if(inferredCategory=="feature_request" || inferredCategory=="question"){
        reviewSeverity=publicSDK.TicketSeverity.Low;
      }
      else if(inferredCategory=='negative_feedback' || inferredCategory=='logistics_experience'){
        reviewSeverity=publicSDK.TicketSeverity.Medium;
      }
      else {
        reviewSeverity=publicSDK.TicketSeverity.High;
      }
      // Create a ticket with title as review title and description as review text.
      const createTicketResp = await apiUtil.createTicket({
        title: review_title,
        tags: [{id: tags[inferredCategory].id}],
        body: review_summary+"\n"+reviewUrl,
        type: publicSDK.WorkType.Ticket,
        owned_by: [inputs['default_owner_id']],
        applies_to_part: inputs['default_part_id'],
        severity:reviewSeverity,
      });
      if (!createTicketResp.success) {
        console.error(`Error while creating ticket: ${createTicketResp.message}`);
        continue;
      }
      // Post a message with ticket ID.
      const ticketID = createTicketResp.data.work.id;
      const ticketCreatedMessage = inferredCategory != 'failed_to_infer_category' ? `Created ticket: <${ticketID}> and it is categorized as ${inferredCategory}` : `Created ticket: <${ticketID}> and it failed to be categorized`;
      const postTicketResp: HTTPResponse  = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, ticketCreatedMessage, 1);
      if (!postTicketResp.success) {
        console.error(`Error while creating timeline entry: ${postTicketResp.message}`);
        continue;
      }
      if(reviewSeverity!=publicSDK.TicketSeverity.Blocker){
        let issuepriority:publicSDK.IssuePriority;
        if(reviewSeverity==publicSDK.TicketSeverity.Low){
          issuepriority=publicSDK.IssuePriority.P3;
        }
        else if(reviewSeverity==publicSDK.TicketSeverity.Medium){
          issuepriority=publicSDK.IssuePriority.P2;
        }
        else{
          issuepriority=publicSDK.IssuePriority.P1;
        }
        //genrate title and gist of reviews
        systemPrompt = `You are an expert at summarizing a given App Review in title and summary. You are provided with a review for the app ${inputs['app_name']}. Your goal is to generate a concise title for the review and a summary that includes essential information only. The output should be a JSON with fields "title" and "summary".

        Instructions:
        
        1. The title should succinctly describe solution for the main topic or issue raised in the review.
        2. The summary should include relevant information only, removing any irrelevant parts, emojis, punctuation, or lines describing the writer's sentiment.
        3. Use Third-Person perspective (like a system addressing the product designer) perspective in the summary.
        
        Review:{review}
        
        Output:`
        humanPrompt = ``;
        llmResponse = {};
        let issue_title:string='';
        let issue_summary:string='';
        try {
          llmResponse = await llmUtil.chatCompletion(systemPrompt, humanPrompt, {review: reviewText});
        } catch (err) {
          console.error(`Error while calling LLM: ${err}`);
        }
        if ('title' in llmResponse) {
          issue_title= llmResponse['title'] as string;
        }
        if ('summary' in llmResponse){
          issue_summary=llmResponse['summary'] as string;
        }
        // Post a progress message saying creating issue for review with review URL posted.
        postResp  = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, `Creating issue for review: ${reviewID}`, 1);
        if (!postResp.success) {
          console.error(`Error while creating timeline entry: ${postResp.message}`);
          continue;
        }
        // Create a issue with title as review title and description as review text.
        const createIssueResp = await apiUtil.createIssue({
          title: review_title,
          tags: [{id: tags[inferredCategory].id}],
          body: review_summary+"\n"+reviewUrl,
          type: publicSDK.WorkType.Issue,
          owned_by: [inputs['default_owner_id']],
          applies_to_part: inputs['default_part_id'],
          priority:issuepriority,
        });
        if (!createIssueResp.success) {
          console.error(`Error while creating Issue: ${createIssueResp.message}`);
          continue;
        }
        // Post a message with Issue ID.
        const issueID = createIssueResp.data.work.id;
        const issueCreatedMessage = `Created issue: <${issueID}> and it is categorized as ${inferredCategory}` ;
        const postIssueResp: HTTPResponse  = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, issueCreatedMessage, 1);
        if (!postIssueResp.success) {
          console.error(`Error while creating timeline entry: ${postIssueResp.message}`);
          continue;
        }
      }
    }
    // Call an LLM to categorize the review as Bug, Feature request, or Question.
  }
};

export default run;
