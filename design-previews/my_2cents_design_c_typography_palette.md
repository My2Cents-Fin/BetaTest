# My 2cents --- Design C Typography & Colour Palette

## Typography --- Design C

### Primary Typeface (Locked)

**Poppins (Google Font)**

  -----------------------------------------------------------------------
  Weight                  Name                    Usage
  ----------------------- ----------------------- -----------------------
  **400**                 Regular                 Body text, labels, "My"
                                                  in wordmark

  **500**                 Medium                  Section titles, list
                                                  labels, secondary
                                                  emphasis

  **600**                 SemiBold                Numbers, primary
                                                  headings, "2cents" in
                                                  wordmark, buttons

  **700**                 Bold                    Large display numbers
                                                  (e.g., big balances)
  -----------------------------------------------------------------------

### Logo & Wordmark Typography

Header lockup: `[ 2. ]  My 2cents`

-   **"2." (mark)**
    -   Custom-drawn symbol inspired by **Poppins SemiBold (600)**
-   **"My"**
    -   Poppins **400 (Regular)**\
    -   \~18px on web header
-   **"2cents"**
    -   Poppins **600 (SemiBold)**\
    -   Same cap height as "My"

### UI Typography Scale (Web)

-   **Display / Key Numbers**
    -   Poppins **700**, 32--36px, slight negative tracking
-   **Primary Headings**
    -   Poppins **600**, 16--18px
-   **Section Titles**
    -   Poppins **600**, 14px
-   **Body Text**
    -   Poppins **400**, 13--14px
-   **Secondary / Muted Text**
    -   Poppins **400**, 12--13px
-   **Buttons**
    -   Poppins **600**, 14--15px

------------------------------------------------------------------------

## Colour Palette --- Design C

### Brand Primary

  -----------------------------------------------------------------------
  Name                    Hex                     Usage
  ----------------------- ----------------------- -----------------------
  **Deep Plum**           `#6A4C6B`               Logo "2", primary
                                                  buttons, accents,
                                                  progress bars

  **Darker Plum**         `#5A3D5B`               Header gradient end
  -----------------------------------------------------------------------

**Header Gradient:**\
`linear-gradient(135deg, rgba(106,76,107,0.95), rgba(90,61,91,0.95))`

### Accent

  Name             Hex         Usage
  ---------------- ----------- -------------------------------------
  **Honey Gold**   `#D4A84B`   Dot in "2." logo, subtle highlights

### Backgrounds

  Name                    Hex         Usage
  ----------------------- ----------- -----------------------
  **Cream / Off-white**   `#FDFBF7`   Page background
  **White**               `#FFFFFF`   Cards, sheets, modals

### Text

  Name                 Hex         Usage
  -------------------- ----------- ----------------------------
  **Primary Text**     `#2B2A28`   Main body text
  **Secondary Text**   `#6B655F`   Labels, captions, metadata

### Neutrals / Surfaces

  Name                 Hex         Usage
  -------------------- ----------- ---------------------
  **Sand / Divider**   `#E7E3DC`   Borders, separators

### Status Colours

  State                      Hex         Usage
  -------------------------- ----------- ---------------------
  **Success / On Track**     `#2E7D32`   Green progress bars
  **Warning / Near Limit**   `#F57C00`   Amber progress bars
  **Over Budget**            `#D32F2F`   Red progress bars

### Soft Category Tints

  Category   Hex
  ---------- -----------
  **Food**   `#E6F4EA`
  **Rent**   `#F2ECF3`
  **Fuel**   `#E8F1FF`
  **EMI**    `#FFF3E6`

------------------------------------------------------------------------

## Surface & Glass Treatment

-   Background: `rgba(255,255,255,0.9)`\
-   `backdrop-filter: blur(8px)`\
-   Border: `1px solid rgba(0,0,0,0.05)`\
-   Border radius: **22px**

**Header:**\
- `backdrop-filter: blur(10px)`\
- No solid border
