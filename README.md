# VoC Aggregator: AI-Powered Customer Feedback Analysis

In today's digital landscape, understanding customer sentiments scattered across various platforms is crucial for businesses to tailor their products and services effectively. The VoC Aggregator project aims to tackle this challenge by providing a comprehensive solution for ingesting, processing, and analyzing customer feedback from diverse sources such as Playstore and Twitter, leveraging AI technologies and the DevRev platform.

## Problem Statement

In the era of digital communication, valuable customer feedback is spread across numerous channels including social media, app reviews, and forums. Collating and understanding this Voice of Customer (VoC) data is essential for businesses to grasp customer needs and preferences. However, the unstructured nature and sheer volume of this data make it difficult to derive actionable insights efficiently.

## Solution Overview

The VoC Aggregator project offers an AI-powered solution that seamlessly aggregates VoC data from multiple sources using [snap-ins](https://docs.devrev.ai/snap-ins/concepts) provided by the DevRev platform. Here's how the solution works:

1. **Data Ingestion**: The project ingests data from Playstore and Twitter. It retrieves app reviews using app IDs from Playstore and fetches relevant Twitter posts based on specified hashtags and mentions.

2. **AI Processing**:
    - **Noise Reduction**: Short and irrelevant reviews are filtered out to clean the data.
    - **Duplicate Removal**: Only unique reviews are retained to eliminate redundancy.
    - **Summarization**: A concise title and summary are generated for each review to enhance readability.
    - **Classification**: Reviews are categorized and tagged with severity levels for better organization and prioritization.
  
3. **Ticket Creation**: Tickets are created for each review along with corresponding issues, facilitating streamlined management and action-taking.

4. **Integration with DevRev Platform**: Users can create snap-ins on the DevRev platform to utilize the project effectively. Detailed instructions on how to create snap-ins can be found [here](https://docs.devrev.ai/snap-ins/concepts).

## Getting Started

To use the VoC Aggregator project, you'll need the following:
- OpenAI API key
- RapidAPI API key

Follow these steps to get started:

1. Clone the repository:

```bash
git clone https://github.com/piyushjain16/devrev-project-final
```

2. Create [Snap-ins](https://docs.devrev.ai/snap-ins/start)

## Contributing

Contributions to the project are welcome! Please refer to the [Contribution Guidelines](CONTRIBUTING.md) for more details on how to contribute.

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

For any inquiries or support, please contact [16piyush03jain@gmail.com.com](mailto:16piyush03jain@gmail.com).
