const fs = require('fs');

const mealsPath = 'app/(tabs)/meals.tsx';
let mealsContent = fs.readFileSync(mealsPath, 'utf8');

const replacement = `                pendingFeasts.map((feast) => {
                  const isHost = feast.hostId === currentUser.id;
                  
                  if (!isHost) {
                    return (
                      <StickerCard
                        key={feast.id}
                        backgroundColor="#FFF8E7"
                        borderRadius={22}
                        style={styles.inviteCard}
                      >
                        {/* Handover V2 Screen 14: You're In! Confirmed Feast View */}
                        <View style={styles.acceptedInviteWrap}>
                          <View style={styles.youreInBanner}>
                            <Text style={styles.youreInTitle}>You're in!</Text>
                            <Text style={styles.youreInSubtitle}>
                              See you {formatScheduledFor(feast.scheduledFor) || 'soon'}
                            </Text>
                          </View>

                          <Text style={styles.inviteRecipeTitle}>
                            {feast.recipeTitle} ({feast.cookTime || '25 min'})
                          </Text>

                          {feast.bringBreakdown && feast.bringBreakdown.length > 0 && (
                            <View style={styles.bringBox}>
                              <Text style={styles.bringBoxHeading}>Who's bringing what:</Text>
                              {feast.bringBreakdown.map((item, bIdx) => (
                                <Text key={bIdx} style={styles.bringLine}>
                                  <Text style={styles.bringWho}>{item.who}: </Text>
                                  {item.items}
                                </Text>
                              ))}
                            </View>
                          )}

                          <Text style={styles.confirmedAttendeesHeading}>
                            Confirmed attendees:
                          </Text>
                          <View style={styles.confirmedAttendeesRow}>
                            {feast.invitedFriends
                              .filter((f) => f.status === 'accepted')
                              .map((f) => (
                                <View key={f.id} style={styles.attendeePill}>
                                  <Text style={styles.attendeePillCheck}>✓</Text>
                                  <Text style={styles.attendeePillName}>
                                    {f.name.split(' ')[0]}
                                  </Text>
                                </View>
                              ))}
                          </View>

                          <Pressable
                            style={styles.cantMakeItBtn}
                            onPress={() => handleDeclineInvite(feast)}
                            hitSlop={8}
                          >
                            <Text style={styles.cantMakeItText}>
                              Can't make it? Let them know
                            </Text>
                          </Pressable>
                        </View>
                      </StickerCard>
                    );
                  }

                  return (
                    <StickerCard
`;

mealsContent = mealsContent.replace(
  `                pendingFeasts.map((feast) => (
                  <StickerCard`,
  replacement
);

fs.writeFileSync(mealsPath, mealsContent);
