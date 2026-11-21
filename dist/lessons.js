const standards = {
  did: ['DID Core 1.0', 'W3C Recommendation', 'https://www.w3.org/TR/did-1.0/', 'Identifier syntax, DID documents, and verification relationships.'],
  did11: ['DID Core 1.1', 'W3C Candidate Recommendation', 'https://www.w3.org/TR/did-1.1/', 'A newer version under review. The first lab uses the 1.0 Recommendation.'],
  resolution: ['DID Resolution 1.0', 'W3C Candidate Recommendation Draft', 'https://www.w3.org/TR/did-resolution/', 'An evolving specification for resolution results and metadata.'],
  vc: ['Verifiable Credentials 2.0', 'W3C Recommendation', 'https://www.w3.org/TR/vc-data-model-2.0/', 'Credential data model, roles, and claim semantics.'],
  issuance: ['OpenID4VCI 1.0', 'OpenID Final', 'https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html', 'Credential issuance between an issuer and a wallet.'],
  presentation: ['OpenID4VP 1.0', 'OpenID Final', 'https://openid.net/specs/openid-4-verifiable-presentations-1_0.html', 'Credential requests, wallet responses, and verifier binding.'],
  status: ['Bitstring Status List 1.0', 'W3C Recommendation', 'https://www.w3.org/TR/vc-bitstring-status-list/', 'A privacy-preserving way to publish credential status.'],
  flutter: ['Flutter App Architecture', 'Flutter documentation', 'https://docs.flutter.dev/app-architecture/guide', 'Views, view models, repositories, services, and optional domain logic.']
};

const lessons = [
  {
    id:'did', short:'DID fundamentals', title:'Decentralized identifiers', tag:'DID Core', time:25, icon:'key', ref:'did',
    intro:'Build the identity layer of your Flutter wallet, starting with the identifier that everything else connects to.',
    concept:'An identifier with a method',
    explain:'A decentralized identifier (DID) is a URI. Its method defines how the identifier is created and resolved. The resulting DID document can describe verification methods and service endpoints.',
    detail:'Keep parsing, resolution, and proof verification in separate steps. A well-formed identifier only tells the wallet that it can dispatch to a method adapter.',
    shape:['did','example','alice:wallet'], shapeLabels:['Scheme','Method','Method-specific ID'],
    exercise:'Parse a DID in Dart',
    task:'Split this example DID into its method and method-specific ID. Keep colons inside the ID intact. This exercise covers simple, unescaped base DIDs from fixtures.',
    file:'did_parser.dart', signature:'String parseDid(String input)',
    source:`final match = RegExp(r'^did:([a-z0-9]+):((?:[A-Za-z0-9._-]*:)*[A-Za-z0-9._-]+)$')
      .firstMatch(input);
  if (match == null) return 'Invalid DID';
  return '\${match[1]} / \${match[2]}';`, entry:'parseDid',
    why:'The method is captured once and the rest stays together. The final ID segment must contain a character. The exercise leaves percent encoding and DID URLs for a full parser.',
    cases:[['did:example:alice:wallet','example / alice:wallet'],['did:web:issuer.example','web / issuer.example'],['did:Example:alice','Invalid DID'],['did:example:alice:','Invalid DID']],
    check:input=>{const m=/^did:([a-z0-9]+):((?:[A-Za-z0-9._-]*:)*[A-Za-z0-9._-]+)$/.exec(input);return m ? m[1]+' / '+m[2] : 'Invalid DID';},
    next:'Add a DID value object', action:'Create lib/identity/domain/did.dart in your Flutter project. Return a typed Did value and add tests for a nested ID, an invalid method, and an empty final segment.',
    stretch:'Write tests for percent-encoded IDs and DID URLs, then expose them through dedicated parser APIs with different return types.'
  },
  {
    id:'resolution',short:'DID resolution',title:'Resolve a DID document',tag:'DID resolution',time:30,icon:'route',ref:'resolution',
    intro:'Connect the DID value object from Week 1 to an injectable resolver with predictable outcomes.',
    concept:'Resolve through a method adapter',
    explain:'A resolver selects an adapter based on the DID method and returns a document or a typed failure. Separate method handling and transport so the wallet can use deterministic fixtures in tests.',
    detail:'A document gives your wallet public verification material. Proof verification still needs the right verification relationship, key, and cryptographic suite.',
    exercise:'Route a DID to a resolver', task:'Model the resolver boundary with a fixed store. Report unsupported methods separately from missing fixture documents.',
    file:'did_resolver.dart',signature:'String resolveDid(String did)',entry:'resolveDid',
    source:`const documents = {'did:example:issuer': 'Issuer document'};
  if (!did.startsWith('did:example:')) return 'Unsupported method';
  return documents[did] ?? 'Not found';`,
    why:'Distinct outcomes let a view model show useful messages and prevent a missing record from being confused with an unsupported method.',
    cases:[['did:example:issuer','Issuer document'],['did:example:someone','Not found'],['did:web:issuer.example','Unsupported method']],
    check:x=>x==='did:example:issuer'?'Issuer document':x.startsWith('did:example:')?'Not found':'Unsupported method',
    next:'Inject a fixture resolver',action:'Define a DidResolver interface and inject a fixture adapter into an issuer-details view model. Render loading, found, missing, and unsupported states.',
    stretch:'Add concurrent-request deduplication with a fake clock and test that failures do not become permanent cache entries.'
  },
  {
    id:'credentials',short:'Verifiable credentials',title:'Model a verifiable credential',tag:'VC Data Model 2.0',time:35,icon:'shield',ref:'vc',
    intro:'Use your issuer identifier and resolver boundary to turn a VC 2.0 fixture into a Flutter credential card.',
    concept:'Separate the issuer from the claims',
    explain:'A credential records claims about one or more subjects. The issuer makes those claims. A holder can possess and present the credential, and a verifier evaluates it according to its own policy.',
    detail:'VC 2.0 allows issuer to be a URL string or an object with an id. A rendered credential card is distinct from the result of cryptographic verification.',
    exercise:'Normalize the issuer field',task:'Read both supported issuer forms from JSON. Report missing or malformed fields so the UI can show a clear state.',
    file:'credential_reader.dart',imports:"import 'dart:convert';",signature:'String readIssuer(String json)',entry:'readIssuer',
    source:`try {
    final value = jsonDecode(json);
    if (value is! Map) return 'Missing issuer';
    final issuer = value['issuer'];
    if (issuer is String && issuer.isNotEmpty) return issuer;
    if (issuer is Map && issuer['id'] is String &&
        (issuer['id'] as String).isNotEmpty) return issuer['id'] as String;
    return 'Missing issuer';
  } on FormatException {
    return 'Invalid JSON';
  }`,
    why:'Normalize at the serialization boundary. A typed model can then represent issuer identity separately from claim presentation and verification results.',
    cases:[['{"issuer":"did:example:issuer"}','did:example:issuer'],['{"issuer":{"id":"did:example:uni"}}','did:example:uni'],['{"issuer":{}}','Missing issuer'],['{','Invalid JSON']],
    check:x=>{try{const v=JSON.parse(x)?.issuer;return (typeof v==='string'?v:typeof v?.id==='string'?v.id:'')||'Missing issuer';}catch{return 'Invalid JSON';}},
    next:'Render a credential summary',action:'Create a CredentialSummary domain model and render issuer, type, and validity in a Flutter list item using fixture data.',
    stretch:'Model one-or-many subjects and test that the wallet never merges claims that belong to different subjects.'
  },
  {
    id:'wallet',short:'Wallet architecture',title:'Build the wallet repository',tag:'Flutter architecture',time:35,icon:'wallet',ref:'flutter',
    intro:'Put the credential model behind a repository your Flutter screens can use and test independently.',
    concept:'Keep the repository as the source of truth',
    explain:'A view renders UI state, a view model handles UI actions, and a repository owns credential data. Services adapt persistence, platform keys, and exchange endpoints.',
    detail:'Persist credential records and key references through distinct interfaces. Platform key capabilities vary by device and algorithm, so expose them through an explicit adapter.',
    exercise:'Deduplicate wallet records',task:'Accept a comma-separated list of fixture storage keys. Keep the first occurrence of each ID, in order.',
    file:'wallet_repository.dart',signature:'String uniqueCredentialIds(String ids)',entry:'uniqueCredentialIds',
    source:`return ids
      .split(',')
      .map((id) => id.trim())
      .where((id) => id.isNotEmpty)
      .toSet()
      .join(', ');`,
    why:'Dart’s default set preserves insertion order. In the wallet use a stable local storage key even for credentials without an id property.',
    cases:[['a,b,a','a, b'],['  c, , a, c','c, a'],['','']],
    check:x=>[...new Set(x.split(',').map(y=>y.trim()).filter(Boolean))].join(', '),
    next:'Back the screen with a repository',action:'Build an in-memory CredentialRepository and inject it into a wallet view model. Test import, refresh, and removal through that interface.',
    stretch:'Add a migration test that preserves existing records and a concurrency test for two simultaneous imports.'
  },
  {
    id:'issuance',short:'Credential issuance',title:'Receive a credential offer',tag:'OpenID4VCI 1.0',time:40,icon:'link',ref:'issuance',
    intro:'Add an OpenID4VCI entry point to the wallet repository and start with issuer metadata.',
    concept:'Keep the issuer and token service separate',
    explain:'OpenID4VCI defines credential issuance. A wallet can use issuer metadata to discover supported credentials and endpoints. An authorization server handles OAuth and can be a separate service.',
    detail:'This lab uses HTTPS fixtures with no custom port or trailing slash. A production implementation needs the full metadata rules and issuer validation.',
    exercise:'Build a metadata URL',task:'Place the credential-issuer well-known path before any path in the fixture issuer identifier.',
    file:'issuer_metadata.dart',signature:'String issuerMetadata(String issuer)',entry:'issuerMetadata',
    source:`final uri = Uri.tryParse(issuer);
  if (uri == null || uri.scheme != 'https' || uri.host.isEmpty ||
      uri.hasQuery || uri.hasFragment || uri.userInfo.isNotEmpty) {
    return 'Invalid issuer';
  }
  return 'https://\${uri.authority}/.well-known/openid-credential-issuer\${uri.path}';`,
    why:'A multi-tenant issuer can have its own path. Insert the well-known segment between the authority and that path.',
    cases:[['https://issuer.example','https://issuer.example/.well-known/openid-credential-issuer'],['https://issuer.example/university','https://issuer.example/.well-known/openid-credential-issuer/university'],['http://issuer.example','Invalid issuer']],
    check:x=>{try{const u=new URL(x);const path=u.pathname==='/'?'':u.pathname;return u.protocol==='https:'&&!x.includes('?')&&!x.includes('#')&&!u.username&&!u.password?u.origin+'/.well-known/openid-credential-issuer'+path:'Invalid issuer';}catch{return 'Invalid issuer';}},
    next:'Add an import state machine',action:'Use a fake issuance service to drive offer received, metadata loaded, consent required, credential received, and failure states. Store only after import checks pass.',
    stretch:'Add tests for user cancellation, duplicate callbacks, and a transient failure after authorization.'
  },
  {
    id:'presentation',short:'Presentations',title:'Present a credential with consent',tag:'OpenID4VP 1.0',time:40,icon:'target',ref:'presentation',
    intro:'Take a credential out of the wallet through a request-driven consent flow.',
    concept:'Bind a presentation to its request',
    explain:'OpenID4VP 1.0 uses DCQL to describe credential requirements. A wallet should show the intended verifier and the information to be shared before sending a presentation. Cryptographic binding rules depend on the credential format.',
    detail:'This exercise checks normalized audience and nonce values. Apply the format-specific proof rules and replay controls at the verification boundary.',
    exercise:'Check normalized request binding',task:'For the fixture request, compare the parsed audience and nonce against the verifier and the request nonce.',
    file:'presentation_binding.dart',signature:'String checkBinding(String input)',entry:'checkBinding',
    source:`final parts = input.split('|');
  if (parts.length != 2) return 'Invalid fixture';
  if (parts[0] != 'verifier-1') return 'Wrong audience';
  if (parts[1] != 'session-42') return 'Wrong nonce';
  return 'Matches request';`,
    why:'Independent checks give the verifier a distinct failure reason. The application can show a safe generic message while keeping diagnostic reasons internal.',
    cases:[['verifier-1|session-42','Matches request'],['other|session-42','Wrong audience'],['verifier-1|old','Wrong nonce']],
    check:x=>{const p=x.split('|');return p.length!==2?'Invalid fixture':p[0]!=='verifier-1'?'Wrong audience':p[1]!=='session-42'?'Wrong nonce':'Matches request';},
    next:'Build a consent screen',action:'Show the verifier identity and requested claims from a fixture. Test that deny returns without preparing or sending a presentation.',
    stretch:'Model a single-use request nonce and write a test that rejects a replay after a successful response.'
  },
  {
    id:'status',short:'Status and trust',title:'Evaluate credential status',tag:'Bitstring Status List',time:40,icon:'shield',ref:'status',
    intro:'Connect verification evidence and status to the wallet UI without losing failure information.',
    concept:'Represent unknown status explicitly',
    explain:'A Bitstring Status List credential encodes purpose-specific statuses such as revocation or suspension. A verifier evaluates the signed list and interprets the entry according to its status purpose.',
    detail:'A fetch or validation failure yields unknown status. Application policy determines how to handle uncertainty for a particular transaction.',
    exercise:'Interpret a revocation fixture',task:'Given a normalized revocation result from a trusted adapter, preserve unknown as its own state.',
    file:'credential_status.dart',signature:'String revocationState(String flag)',entry:'revocationState',
    source:`return switch (flag) {
    '0' => 'Clear',
    '1' => 'Revoked',
    _ => 'Unknown',
  };`,
    why:'The UI can keep revoked and temporarily unknown separate. Overall acceptance still depends on signature, issuer trust, time validity, and the application’s policy.',
    cases:[['0','Clear'],['1','Revoked'],['offline','Unknown']],
    check:x=>x==='0'?'Clear':x==='1'?'Revoked':'Unknown',
    next:'Expose verification reasons',action:'Add a typed verification result to the wallet. Test untrusted issuer, status unavailable, revoked, and proof rejected independently.',
    stretch:'Model cache expiry with a fake clock and test a high-risk policy that fails closed for a stale list.'
  },
  {
    id:'capstone',short:'Wallet capstone',title:'Connect the wallet end to end',tag:'Wallet capstone',time:55,icon:'wallet',ref:'flutter',
    intro:'Bring DID resolution, issuance, storage, consent, and verification together through the interfaces you built.',
    concept:'Let domain outcomes drive the UI',
    explain:'Your wallet can model each exchange as a sequence of explicit states. Keep external actions behind adapters so the same UI can be exercised with fixtures or a test issuer and verifier.',
    detail:'Use synthetic data in demos. Portfolio documentation should name supported formats, trusted test parties, and the boundaries of platform key support.',
    exercise:'Gate the share action',task:'For the fixture state, require consent and an unexpired session before enabling share.',
    file:'wallet_flow.dart',signature:'String shareState(String input)',entry:'shareState',
    source:`return switch (input) {
    'consent:yes,session:active' => 'Ready to share',
    'consent:yes,session:expired' => 'Request expired',
    _ => 'Sharing blocked',
  };`,
    why:'A view can display the same state that guards the command. Recheck request validity at dispatch time so that expiry cannot race with a tap.',
    cases:[['consent:yes,session:active','Ready to share'],['consent:yes,session:expired','Request expired'],['consent:no,session:active','Sharing blocked']],
    check:x=>x==='consent:yes,session:active'?'Ready to share':x==='consent:yes,session:expired'?'Request expired':'Sharing blocked',
    next:'Ship a fixture-driven demo',action:'Record a complete demo: issue a credential, store it, review a request, consent, and verify. Add a README with the architecture and the protocol and credential versions you implemented.',
    stretch:'Exchange fixtures with an independent test implementation. Capture any interoperability gap as a reproducible regression test.'
  }
];
