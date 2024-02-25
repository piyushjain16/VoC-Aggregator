import {publicSDK } from '@devrev/typescript-sdk';
import * as gplay from "google-play-scraper";
import { ApiUtils, HTTPResponse,UniqueReviewData } from './utils';
import {LLMUtils} from './llm_utils';

export const run = async (events: any[]) => {
  for (const event of events) {
    const endpoint: string = event.execution_metadata.devrev_endpoint;
    const token: string = event.context.secrets.service_account_token;
    const openaiApiKey: string = event.input_data.keyrings.openai_api_key;
    const apiUtil: ApiUtils = new ApiUtils(endpoint, token);
    // Get the number of reviews to fetch from command args.
    const snapInId = event.context.snap_in_id;
    const devrevPAT = event.context.secrets.service_account_token;
    const baseURL = event.execution_metadata.devrev_endpoint;
    const inputs = event.input_data.global_values;
    let parameters:string = event.payload.parameters.trim();
    const tags = event.input_data.resources.tags;
    const llmUtil: LLMUtils = new LLMUtils(openaiApiKey, `gpt-3.5-turbo-0125`, 200);
    let numReviews = 10;
    let minReviewSize=3;
    let commentID : string | undefined;
    if (parameters === 'help') {
      // Send a help message in CLI help format.
      const helpMessage = `playstore_reviews_process - Fetch reviews from Google Play Store and create tickets in DevRev.\n\nUsage: /playstore_reviews_process <number_of_reviews_to_fetch>\n\n\`number_of_reviews_to_fetch\`: Number of reviews to fetch from Google Playstore. Should be a number between 1 and 100. If not specified, it defaults to 10.`;
      let postResp  = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, helpMessage, 1);
      if (!postResp.success) {
        console.error(`Error while creating timeline entry: ${postResp.message}`);
        continue;
      }
      continue
    }
    let postResp: HTTPResponse = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, 'Fetching reviews from Playstore', 1);
    if (!postResp.success) {
      console.error(`Error while creating timeline entry: ${postResp.message}`);
      continue;
    }
    if (!parameters) {
      // Default to 10 reviews.
      parameters = '10';
    }
    try {
      numReviews = parseInt(parameters);

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
    // Call google playstore scraper to fetch those number of reviews.
    let getReviewsResponse:any = await gplay.reviews({
      appId: inputs['app_id'],
      country: 'in',
      sort: gplay.sort.HELPFULNESS,
      num: numReviews,
      throttle: 10,
    });
    // Post an update about the number of reviews fetched.
    postResp  = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, `Fetched ${numReviews} reviews, creating tickets now.`, 1);
    if (!postResp.success) {
      console.error(`Error while creating timeline entry: ${postResp.message}`);
      continue;
    }
    commentID = postResp.data.timeline_entry.id;
    let reviews:gplay.IReviewsItem[] = getReviewsResponse.data;

    let unique_reviews:string[]=[];
    let unique_reviews_data:UniqueReviewData={reviewdata:[]};
    // For each review, create a ticket in DevRev.
    for(const review of reviews) {
      // removing short reviews
      if(review.text.length<=minReviewSize){
        continue;
      }
      const reviewText = `Ticket created from Playstore review ${review.url}\n\n${review.text}`;
      const reviewTitle = review.title || `Ticket created from Playstore review ${review.url}`;
      const reviewID = review.id;
      const reviewVote=review.thumbsUp;
      // remove meaningless reviews
      let systemPrompt = `You are an expert at classifying a given Review as relevant or irrelevant.Any review related to customer request, customer service,app service,complain, feedback,question,bug,product issue should be classified as relevant .You have to label the review as true if it is relevant or false if it is irrelevant. The output should be a JSON with fields "relevance" and "reason". The "relevance" field should be one of "true" or "false". The "reason" field should be a string explaining the reason for the relevance. \n\nReview: {review}\n\nOutput:`;
      let humanPrompt = ``;
      let llmResponse = {};
      let relevant:boolean=true ;
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
      systemPrompt = `You are an expert at classifying a given App Review as duplicate or unique. You are given a review provided by a user for the app ${inputs['app_id']} and a list containing previous reviews from the database. Your task is to label the review as duplicate if its context matches with any past review from the database, or false if it has a unique context.

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
        llmResponse = await llmUtil.chatCompletion(systemPrompt, humanPrompt, {past_reviews:unique_reviews.join(",\n"),review: review.text});   
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
      systemPrompt = `You are an expert at summarizing a given App Review in title and summary. You are provided with a review for the app Blinkit. Your goal is to generate a concise title for the review and a summary that includes essential information only. The output should be a JSON with fields "title" and "summary".

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
      systemPrompt = `You are an expert at labelling a given App Review as bug, feature_request, question,customer_support, positive_feedback or negative_feedback. You are given a review provided by a user for the app ${inputs['app_id']}. You have to label the review as bug, feature_request, question, customer_support, positive_feedback or negative_feedback. The output should be a JSON with fields "category" and "reason". The "category" field should be one of "bug", "feature_request", "question", "customer_support", "positive_feedback" or "negative_feedback". The "reason" field should be a string explaining the reason for the category. \n\nReview: {review}\n\nOutput:`;
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
      if (inferredCategory=='bug'){
        // Post a progress message saying creating issue for review with review URL posted.
        postResp  = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, `Creating issue for review: ${review.id}`, 1);
        if (!postResp.success) {
          console.error(`Error while creating timeline entry: ${postResp.message}`);
          continue;
        }
        // Create a issue with title as review title and description as review text.
        const createIssueResp = await apiUtil.createIssue({
          title: review_title,
          tags: [{id: tags[inferredCategory].id}],
          body: review_summary+"\n"+review.url,
          type: publicSDK.WorkType.Issue,
          owned_by: [inputs['default_owner_id']],
          applies_to_part: inputs['default_part_id'],
          // priority:publicSDK.IssuePriority.P1,
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
      else{
        // Post a progress message saying creating ticket for review with review URL posted.
        postResp  = await apiUtil.postTextMessageWithVisibilityTimeout(snapInId, `Creating ticket for review: ${review.id}`, 1);
        if (!postResp.success) {
          console.error(`Error while creating timeline entry: ${postResp.message}`);
          continue;
        }
        // Create a ticket with title as review title and description as review text.
        const createTicketResp = await apiUtil.createTicket({
          title: review_title,
          tags: [{id: tags[inferredCategory].id}],
          body: review_summary+"\n"+review.url,
          type: publicSDK.WorkType.Ticket,
          owned_by: [inputs['default_owner_id']],
          applies_to_part: inputs['default_part_id'],
          // source_channel:"product",
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
      }      
    }
    // Call an LLM to categorize the review as Bug, Feature request, or Question.
  }
};

export default run;
