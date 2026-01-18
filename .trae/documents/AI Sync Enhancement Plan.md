I will implement the requested AI enhancements and sync logic improvements.

### 1. Enhance AI Service (`server/services/ai-service.js`)

* **Return Scraped Content**: Update `analyzeContent` to return the full scraped text (`fetchedContent`) so it can be stored.

* **Refine Prompt**: Update the Gemini prompt to explicitly ask for:

  * A **refined title** (re-processed from the original).

  * A **concise summary**.

  * **Detailed content** (if from a URL).

* **Error Handling**: Ensure robust handling if the AI service fails or if the URL cannot be scraped.

### 2. Integrate AI into Sync Process (`server/services/sync-service.js`)

* **Hook into** **`createLocalContents`**: Modify the data ingestion flow for *new* records coming from Feishu.

* **Trigger Condition**: When a new record is detected (during `pullFromFeishu`), if it has a URL (`source`) or substantial content:

  * Call `analyzeContent` with the source URL or content.

  * **Override Fields**: Update the record's `title`, `summary`, `content` (with scraped detail), and `type` using the AI's response.

  * **Fallback**: If AI fails, proceed with the original data from Feishu.

### 3. Verification & Testing

* **Create Test Script**: `tests/test-ai-sync-flow.js` to simulate a Feishu sync with a new URL record.

* **Validation**:

  * Verify that the AI service scrapes the URL.

  * Verify that the title is refined and summary is generated.

  * Verify that the data is correctly saved to the SQLite database.

* **Run Tests**: Execute the test and report the results.

### Summary of Changes

* `server/services/ai-service.js`: Improve return values and prompt.

* `server/services/sync-service.js`: Add AI processing step for new records.

* `tests/test-ai-sync-flow.js`: New test file.

