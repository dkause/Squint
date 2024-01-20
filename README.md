# Initial Goals
For this UX Course, I had to choose from three apps as a learning project. I took an expert app, as it fitted best to my needs. To connect photographer with customer for selection of photos.

The app I had in mind should help the user to find the best out of similar looking photos. Which is a tedious task to do. Especially in a business context, where companies and other stakeholder's need must be met. This should be intuitive, easy to do and mobile.

When I started photography as a professional in the nineties, we had printed contact sheets or developed slides.
Nowadays, selecting a photo is done per app or a website, a pwa.
![](Squint-Images/contact-sheet.png)

## Exploration
I have used many different apps during the years, but I was never really satisfied. Most had the features I needed, but some other flaws:
• they required logins, which is overkill or companies won't share the credentials
• they had public websites, which the customer might not like
• they had no way to limit the selection of photos
• they had to many features, which needed to be configured or explained
• you could not limit the number of photos to be selected for processing  

To get a better scope on the problem and to discover what others do, I conducted a Competitive and a Swot analysis of two main competitors. After this thorough analysis, which you can read here, I started my own project with a business requirement document, which was helpful to understand the scope and value proposition of my app.

So, I had an idea and a scope and a project name: "SQUINT".
My photo company is named SILBERBLICK, which is Squint in german.
![Logo](Squint-Images/Squint-Logo.jpg)

**SQUINT** is a progressive web app, which helps the user to navigate through amounts of similar looking images and find the best one. It uses a lean interface and smart techniques
• is like Tinder for portrait sessions
• swipe to select your portraits photos
• and match with photographers' choice

### Problem Statement
The user needs a way to select their photos and in case of doubt get quick advice, because the want to get their processed photos in a quick and easy matter.
We know this will be true when the client demands no revisions.
## Building Empathy
To bring the app alive, we need people who use it, and we need to understand these. We can ask or let them test it. But beforehand we need to build a prototype. To get a grip on our futures user's needs and desires, we got some tools: The Personas.
To create relatable personas and user insights, I made interviews (check the interview script in notion or download here) and surveys to understand the user better. I visualized this information into an Affinity Map and Rainbow Sheet.
### Personas
I created from sourced information three personaswhich should represent the whole spectrum of our anticipated users. To deepen our understanding, we create a user journey map, which will show us how they feel and act during the journey through our app.
![Alt text](Squint-Images/Persona-Jochen.png)
![Alt text](Squint-Images/Persona-Peter_Miller.png)
![Alt text](Squint-Images/Persona-Sandra_Oxtail.png)

After a thorough task analysis, we can create an Userflow, which will come in handy, when start prototyping the app. The task analysis also provides us with valid goals for proofing our initial hypothesis.

### Outcome
In this exploration of the user, I learned that is important to create trust, as the selection of a portrait, which might be used for a long time and be highly visible, is a delicate task.

## Wireframes and Prototypes
All ideas start from scratch, scratching the head. In our exploration of the user and our competitive analysis we learned what features a first draft should include:
• Viewing different selections and photos
• Rate a photo
• Share a photo
I created a low fidelity prototype with is close to apps, like lightroom mobile, packed with features.

## Low Fidelity Prototype
![Alt text](Squint-Images/LowFi-Prototype.png)
You can come from selection to an overview, to a single photo which you can share from there, you have a top bar for settings and branding, a bottom bar for navigation and in the single image view, buttons for actions like sharing, rating, and comparing a photo.
Specs met, let's move to the Mid Fidelity Prototype

## Mid Fidelity Prototype
![Alt text](Squint-Images/MidFi-Prototype.png)
## High Fidelity Prototype
![In Color and ready to Go Live](Squint-Images/HiFi-Prototype.png)
I added color as indicator for the photographer's selection and a star as well. Also, to compare images, I created a horizontal split view, where the user can easily switch between images, between a scrollable image carousel and a favorite image. This Idea came from using outlook on my mobile, where you can swipe your emails left and right.
![Alt text](Squint-Images/LoFi-Prototype_CompareView.png)
Up to this point my Design and its features stuck to courses requirements of the project.
## Usability Testing
In my toolbox for usability, I had a consent form, Interview questions, tasks and scenario and a prototype.  You can read this all here.
And, more important **six test persons for a first moderated in-person tests**. My prototype was put in Quant-UX, for later remote tests and heatmaps. And I had a mailing list with more participants for subsequent remote tests.
### First Observations
I could clearly see that all users had problems completing the task, to select a photo and send it to the photographer.
All could accomplish the task, but there was insecurity and a back and forth of clicks or taps. All mistook the rating-star for a selection button. This is too obstructive!![Alt text](Squint-Images/Heat-Map-Star.png)
### A Deeper look
**For subsequent remote tests, I removed the star.** And started my E-Mail campaign. After a few days I analyzed the data and I could see, my design was obviously confusing. ![Alt text](Squint-Images/HeatMap-UserFlow.png)
You can see, this is a confusing noodle soup, neither healthy nor tasty. **The user journey isn`t a straightforward sprint.** More like a drunk stroll through a labyrinth.
I was unhappy with my design, as I found even more usability errors, which I compiled into a Usability Test Report - which you can see here.

After this discouraging experience, I presented this outcome to my mentor. His feedback encouraged me to stick with my original idea, to create a specialized app, just for my needs. And for the first time I really understood, what he meant by "I have a problem with the user value here".  And he asked me to look at tinder.

## Refining the Design
### Reduction
![Alt text](Squint-Images/six-screens.png)
As I removed all unnecessary options and reduce the features to the max, I redefined my design. Got rid of all unnecessary screens. Especially the overview screen, which didn't add value, but confusion, as seen in the usability tests.![Alt text](Squint-Images/four-screens.png)
As the user gets access to his photos via a link in an E-mail, we even don't need a login screen anymore. If he wants to share photos with other, we will explain him how to do a screen shot and how to send it in onboarding.![Alt text](Squint-Images/screens-reduction.png)
Furthermore, I copied the tinder swipe experience, which allowed me to put rating and selection and comparing in one screen. And the swiping experience make selection even more interactive. You can check the prototype at the bottom.
**This was a huge step, as the app felt right for me for the first time.** Now I would polish it.
## Design Foundation

Material Design 3 by Google is the Design System of choice. With a clean look and good documentation plus ready to use layouts, styles, and components for mobile and desktop, it fits good for current and upcoming needs. I find the overall flat with reduced colors look more suitable as Apple's glassy look, as it is less distracting in my view.
For sure, the SQUINT has an **individual Design System**:

## SQUINT Design System
![Design System Colors](Squint-Images/Squint-Design-System_Color.png)
![Design System Grid](Squint-Images/Squint-Design-System_Grid.png)
![Design System UI Elements](Squint-Images/Squint-Design-System_UI_Elements.png)
![Design System Typography](Squint-Images/Squint-Design-System_Typography.png)

I have chosen colors, like black, white, or grey which don't spoil the photos color. With a stark text-background-contrast they provide good readability and accessibility. As a font I used IBM Plex which has a nice Sans for headlines and buttons and genuinely nice serif for copy.  For a detailed view, check the Figma file of [Squint here.](https://www.figma.com/proto/jAgd054xnXmdCasYTCVCAN/SQUINT?kind=&node-id=51179%3A5541&page-id=51179%3A5538&scaling=contain&starting-point-node-id=51179%3A5610&viewport=399%2C48%2C0.25)

## Applied Design
As the Design and apps features are still evolving, you get here a look at the app with the design applied:

![Alt text](Squint-Images/Squint-Screen-Welcome.png)
![Alt text](Squint-Images/Squint-Screen-Hit.png)
![Alt text](Squint-Images/Squint-Screen-Finish.png)
![Alt text](Squint-Images/Squint-Screen-Choice.png)
Click on the first picture to open a lightbox, there you cycle through with the arrows on your keyboard.
For a better experience, check the interactive prototype and learn how I deliver my design and findings.
## Delivery

> emeded figma

I use Figma for Design Delivery, as it provides all I need:
• Assets
• Design System
• Collaboration
• basic prototyping
• inspector for developer hand off
First, I used Zeplin and linked it figma. But I prefer to use less tools and for my project figma has all features I need.
Prototyping could be easier though.
# Squint
