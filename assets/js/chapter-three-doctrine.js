/**
 * Chapter Three doctrinal clarification for The Life of Grace.
 *
 * The Fourth Dimension in this book is God's heavenly Kingdom: the realm
 * of His undisputed government. Satan and demons are spiritual beings,
 * but their present dominion of darkness operates in relation to the
 * fallen earth, not as a rival kingdom inside heaven.
 */
(function () {
  'use strict';

  if (typeof BOOK === 'undefined' || !Array.isArray(BOOK)) return;

  var chapter = BOOK.find(function (entry) {
    return entry && entry.slug === 'chapter-three';
  });

  if (!chapter || typeof chapter.body !== 'string') return;

  function replaceExact(oldText, newText) {
    if (chapter.body.indexOf(oldText) === -1) {
      console.warn('Chapter Three doctrinal patch: source passage not found.');
      return;
    }
    chapter.body = chapter.body.replace(oldText, newText);
  }

  replaceExact(
    `      <p>Yet Scripture does not pretend that everything in the unseen realm bows willingly.</p>
      <p>There was a rebellion.</p>
      <p>It was crushed. Its architect did not vanish, though. He turned what strength he had toward drawing humanity into the very revolt that ruined him.</p>`,
    `      <p>Yet Scripture also records a rebellion among created spirits.</p>
      <p>There was a rebellion, but it did not produce a second kingdom in heaven. Satan and the angels who followed him were cast down. Revelation says that a place was not found for them in heaven any longer (Revelation 12:8). Heaven remained the realm of God's undisputed government.</p>
      <p>The rebel did not vanish. Cast down, he turned his activity toward the earth, drawing humanity into the same distrust, disobedience and revolt that had marked his own fall. The kingdom, or dominion, of darkness is therefore not a rival territory inside heaven. It is a fallen order operating in the earth through deception, sin, rebellious humanity and the influence of the devil and his demons.</p>`
  );

  replaceExact(
    `      <p>The rebellion of Satan did not create a second heavenly kingdom.</p>
      <p>It resulted in his exclusion from the place where God's government is perfectly acknowledged.</p>
      <p>The Fourth Dimension therefore remains exactly what it has always been:</p>
      <p><strong>the realm of God's undisputed rule.</strong></p>
      <p>This also helps us understand an important distinction.</p>
      <p>The Bible reveals that the present world experiences conflict between the Kingdom of God and the kingdom of darkness.</p>
      <p>People are called to choose whom they will serve. Nations rise in rebellion against God's ways. The Gospel advances into places held captive by deception.</p>
      <p>But Scripture never portrays God's heavenly government as sharing authority with another kingdom.</p>
      <p>There is no parliament in heaven where God and Satan negotiate. There is no election to determine who will rule. There is no possibility of a coup. God reigns. That is the settled reality of the Fourth Dimension.</p>
      <p>Perhaps you have wondered,</p>
      <p>"If Satan was cast down, why does the Bible still describe his activity?"</p>
      <p>The answer is that his activity is directed toward the present fallen world.</p>
      <p>His influence is exercised among those who remain in rebellion against God. He seeks to deceive. He seeks to oppose God's purposes in the earth.</p>
      <p>But even here, Scripture continually reminds us that his activity remains under God's sovereign authority and is moving towards an appointed end.</p>`,
    `      <p>The rebellion of Satan did not create a second heavenly kingdom. It resulted in his exclusion from the place where God's government is perfectly acknowledged.</p>
      <p>The Fourth Dimension therefore remains exactly what it has always been:</p>
      <p><strong>the realm of God's undisputed rule.</strong></p>
      <p>This distinction is essential. Satan and demons are spiritual beings, but that does not mean their present activity belongs to God's heaven. The unseen and heaven are not identical ideas. Scripture can describe spiritual activity connected with the earth without placing a kingdom of darkness inside the heavenly government of God.</p>
      <p>The Bible reveals that the present fallen world experiences the activity of the kingdom of darkness. People are drawn into rebellion against God's ways. Nations and systems can be shaped by deception. The Gospel advances into lives and places held captive by falsehood.</p>
      <p>But Scripture never portrays God's heavenly government as sharing authority with another kingdom. There is no parliament in heaven where God and Satan negotiate. There is no election to determine who will rule. There is no possibility of a coup. God reigns. That is the settled reality of the Fourth Dimension.</p>
      <p>Perhaps you have wondered,</p>
      <p>"If Satan was cast down, why does the Bible still describe his activity?"</p>
      <p>The answer is that his present campaign is directed toward the earth. Revelation does not announce woe to heaven because a rival kingdom remains established there. It announces, "Woe to the inhabitants of the earth," because the devil has come down in great wrath and knows that his time is short (Revelation 12:12).</p>
      <p>His influence is therefore exercised within the fallen earthly order: through deception, temptation, accusation, rebellious humanity and demonic activity. He seeks to oppose God's purposes in the earth and to draw human beings into agreement with his rebellion.</p>
      <p>Even here, however, his dominion is temporary, limited and moving towards an appointed end. The devil knows this. The demons know this. Their activity is not evidence of a competing sovereignty in heaven; it is the desperate activity of a defeated rebel whose remaining time on earth is running out.</p>`
  );

  replaceExact(
    `      <p>If God reigns absolutely, why does the spiritual realm so often appear powerful in the wrong hands?</p>
      <p>Why do occult practices sometimes produce real effects? Why do false religions display genuine phenomena? Why do people encounter something in mysticism that seems undeniably real?</p>`,
    `      <p>If God reigns absolutely, why do fallen spiritual powers operating in the earthly realm sometimes appear powerful in the wrong hands?</p>
      <p>Why do occult practices sometimes produce real effects? Why do false religions display genuine phenomena? Why do people encounter something in mysticism that seems undeniably real?</p>`
  );

  replaceExact(
    `      <p>The expression refers to the present world order in its rebellion against God.</p>
      <p>The apostle Paul describes Satan as,</p>`,
    `      <p>The expression refers to the present world order in its rebellion against God.</p>
      <p>This is where the dominion of darkness must be located in our thinking. Its agents are spiritual, but its present sphere of influence is the fallen earth. Satan is never called the ruler of God's heaven. His titles are connected with "this world," "this age," "the power of the air" and the people in whom disobedience is at work.</p>
      <p>The apostle Paul describes Satan as,</p>`
  );

  replaceExact(
    `      <p>The kingdom of darkness therefore does not define reality. It describes the tragic condition of a fallen world. But why is the world like this?</p>`,
    `      <p>The kingdom of darkness therefore does not define ultimate reality. It describes a temporary dominion operating within a fallen world. It has no throne beside God's throne in heaven, no share in the government of the Fourth Dimension and no future beyond the judgment God has appointed. Its present activity is real, but its time is short.</p>
      <p>But why is the world like this?</p>`
  );

  replaceExact(
    `      <p>We began by discovering that the unseen realm is not merely populated by spiritual beings. It is first and foremost God's Kingdom. We then saw that heaven is perfectly governed &mdash; a Kingdom where His will is joyfully accomplished without resistance.</p>`,
    `      <p>We began by distinguishing God's heavenly Kingdom from the unseen activity of fallen spirits in the earth. The Fourth Dimension, as this book uses the expression, is God's Kingdom &mdash; the realm of His undisputed government. Satan and demons are spiritual beings, but they do not constitute a rival kingdom inside heaven. We saw that heaven is perfectly governed &mdash; a Kingdom where God's will is joyfully accomplished without resistance.</p>`
  );

  replaceExact(
    `      <p>This is why the enemy's campaign is finally absurd &mdash; his rebellion against God is already finished and lost; what remains is a campaign against us, waged with strength God gave him and continues to sustain. Power belongs to God. There is no alternative source.</p>`,
    `      <p>This is why the enemy's campaign is finally absurd &mdash; his rebellion against God has already failed, he has been cast down, and what remains is a temporary campaign in the earth against humanity and against the expression of God's purposes here. Revelation says he acts with great wrath precisely because he knows that he has a short time. Power belongs to God. There is no alternative throne, no rival kingdom in heaven and no uncertainty about the end.</p>`
  );
})();
