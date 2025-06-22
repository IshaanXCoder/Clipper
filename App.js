import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width: screenWidth } = Dimensions.get('window');

export default function App() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [numScenes, setNumScenes] = useState('3');
  const [scenes, setScenes] = useState([
    { start: '', end: '', text: '' },
    { start: '', end: '', text: '' },
    { start: '', end: '', text: '' },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNumScenesChange = (value) => {
    const num = parseInt(value) || 0;
    setNumScenes(value);
    
    const newScenes = [];
    for (let i = 0; i < num; i++) {
      newScenes.push(scenes[i] || { start: '', end: '', text: '' });
    }
    setScenes(newScenes);
  };

  const updateScene = (index, field, value) => {
    const updatedScenes = [...scenes];
    updatedScenes[index] = { ...updatedScenes[index], [field]: value };
    setScenes(updatedScenes);
  };

  const validateInputs = () => {
    if (!youtubeUrl.trim()) {
      Alert.alert('Error', 'Please enter a YouTube URL');
      return false;
    }

    if (!youtubeUrl.includes('youtube.com/watch') && !youtubeUrl.includes('youtu.be/')) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return false;
    }

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      if (!scene.start || !scene.end) {
        Alert.alert('Error', `Please fill in start and end times for scene ${i + 1}`);
        return false;
      }

      const start = parseFloat(scene.start);
      const end = parseFloat(scene.end);

      if (isNaN(start) || isNaN(end)) {
        Alert.alert('Error', `Please enter valid numbers for scene ${i + 1} times`);
        return false;
      }

      if (start >= end) {
        Alert.alert('Error', `Start time must be less than end time for scene ${i + 1}`);
        return false;
      }
    }

    return true;
  };

  const processVideo = async () => {
    if (!validateInputs()) return;

    setIsProcessing(true);
    
    // Add debug alerts
    Alert.alert('Debug', 'Starting video processing...');

    try {
      const requestData = {
        youtubeUrl,
        scenes: scenes.map(scene => ({
          start: parseFloat(scene.start),
          end: parseFloat(scene.end),
          text: scene.text || `Scene ${scenes.indexOf(scene) + 1}`
        }))
      };

      console.log('Processing video with data:', requestData);
      
      // Send request to backend API (use your computer's IP address for mobile testing)
      const API_BASE_URL = 'http://192.168.1.33:3000';
      
      // Test connectivity first
      Alert.alert('Debug', `Connecting to ${API_BASE_URL}...`);
      
      const response = await fetch(`${API_BASE_URL}/api/process-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      Alert.alert('Debug', `Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      const jobId = result.jobId;
      
      Alert.alert('Debug', `Job started with ID: ${jobId}`);

      // Poll for job completion
      const checkJobStatus = async () => {
        try {
          console.log(`Checking status for job ${jobId}`);
          const statusResponse = await fetch(`${API_BASE_URL}/api/job-status/${jobId}`);
          const statusResult = await statusResponse.json();
          
          console.log('Job status:', statusResult);

          if (statusResult.status === 'completed') {
            Alert.alert(
              '🎉 Success!', 
              'Your video trailer has been created successfully!',
              [
                { 
                  text: '📥 Download to Phone', 
                  onPress: () => downloadVideo(jobId)
                },
                { text: 'Later' }
              ]
            );
          } else if (statusResult.status === 'failed') {
            Alert.alert('Processing Failed', `Error: ${statusResult.error || 'Unknown error'}`);
            return; // Stop polling
          } else {
            // Still processing, check again in 3 seconds
            Alert.alert('Debug', `Status: ${statusResult.status}`);
            setTimeout(checkJobStatus, 3000);
          }
        } catch (statusError) {
          console.error('Status check error:', statusError);
          Alert.alert('Error checking status', statusError.message);
        }
      };

      // Start polling after 3 seconds
      setTimeout(checkJobStatus, 3000);

    } catch (error) {
      console.error('Process video error:', error);
      Alert.alert('Connection Error', `Failed to process video: ${error.message}\n\nMake sure:\n1. Backend server is running\n2. Your phone and computer are on same WiFi\n3. IP address is correct`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setYoutubeUrl('');
    setNumScenes('3');
    setScenes([
      { start: '', end: '', text: '' },
      { start: '', end: '', text: '' },
      { start: '', end: '', text: '' },
    ]);
  };

  const testConnection = async () => {
    try {
      const API_BASE_URL = 'http://192.168.1.33:3000';
      Alert.alert('Testing', `Connecting to ${API_BASE_URL}/health...`);
      
      const response = await fetch(`${API_BASE_URL}/health`);
      const result = await response.json();
      
      Alert.alert('Connection Test', `✅ Success!\nStatus: ${result.status}\nMessage: ${result.message}`);
    } catch (error) {
      Alert.alert('Connection Test Failed', `❌ Error: ${error.message}\n\nTroubleshooting:\n1. Check if backend server is running\n2. Verify your phone and computer are on same WiFi\n3. Your computer IP might have changed`);
    }
  };

  const downloadVideo = async (jobId) => {
    try {
      const API_BASE_URL = 'http://192.168.1.33:3000';
      const downloadUrl = `${API_BASE_URL}/api/download/${jobId}`;
      
      Alert.alert('Downloading', 'Starting video download...');
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `clipper_trailer_${timestamp}.mp4`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      // Download the file
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri);
      
      if (downloadResult.status === 200) {
        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        
        Alert.alert(
          '✅ Download Complete!', 
          `Video saved as: ${filename}\n\nYou can now share or save it to your camera roll!`,
          [
            {
              text: '📤 Share Video',
              onPress: async () => {
                if (isAvailable) {
                  await Sharing.shareAsync(downloadResult.uri);
                } else {
                  Alert.alert('Sharing not available', 'Sharing is not available on this device');
                }
              }
            },
            {
              text: '📁 View in Files',
              onPress: () => {
                Alert.alert('Video Location', `Your video is saved in:\nFiles app > On My iPhone > Expo Go\n\nFilename: ${filename}`);
              }
            },
            { text: 'Done' }
          ]
        );
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      Alert.alert('Download Failed', `Error: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <ScrollView style={styles.fullContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#000000', '#1a1a1a', '#2a2a2a']}
          style={styles.compactHeroSection}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              Clipper
            </Text>
            <Text style={styles.heroSubtitle}>
              for your content
            </Text>
            <Text style={styles.heroDescription}>
              Transform YouTube videos into professional trailers
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.contentContainer}>
        {/* YouTube URL Input */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>YouTube Video URL</Text>
          <Text style={styles.cardSubtitle}>Paste the link to your source video</Text>
          <TextInput
            style={styles.modernInput}
            placeholder="https://www.youtube.com/watch?v=..."
            placeholderTextColor="#6b7280"
            value={youtubeUrl}
            onChangeText={setYoutubeUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        {/* Number of Scenes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Number of Scenes</Text>
          <Text style={styles.cardSubtitle}>How many clips to extract from the video</Text>
          <TextInput
            style={styles.smallModernInput}
            placeholder="3"
            placeholderTextColor="#6b7280"
            value={numScenes}
            onChangeText={handleNumScenesChange}
            keyboardType="numeric"
            maxLength={1}
          />
        </View>

        {/* Scene Configuration */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scene Configuration</Text>
          <Text style={styles.cardSubtitle}>Define your video segments and overlay text</Text>
          
          {scenes.map((scene, index) => (
            <View key={index} style={styles.modernSceneCard}>
              <View style={styles.sceneHeader}>
                <Text style={styles.modernSceneTitle}>Scene {index + 1}</Text>
                <View style={styles.sceneBadge}>
                  <Text style={styles.sceneBadgeText}>{index + 1}</Text>
                </View>
              </View>
              
              <View style={styles.timeInputRow}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.modernTimeLabel}>Start Time</Text>
                  <TextInput
                    style={styles.modernTimeInput}
                    placeholder="0"
                    placeholderTextColor="#6b7280"
                    value={scene.start}
                    onChangeText={(value) => updateScene(index, 'start', value)}
                    keyboardType="numeric"
                  />
                  <Text style={styles.unitLabel}>seconds</Text>
                </View>
                
                <View style={styles.timeInputContainer}>
                  <Text style={styles.modernTimeLabel}>End Time</Text>
                  <TextInput
                    style={styles.modernTimeInput}
                    placeholder="5"
                    placeholderTextColor="#6b7280"
                    value={scene.end}
                    onChangeText={(value) => updateScene(index, 'end', value)}
                    keyboardType="numeric"
                  />
                  <Text style={styles.unitLabel}>seconds</Text>
                </View>
              </View>

              <View style={styles.textInputContainer}>
                <Text style={styles.modernTimeLabel}>Overlay Text</Text>
                <TextInput
                  style={styles.modernInput}
                  placeholder={`Enter text for scene ${index + 1}`}
                  placeholderTextColor="#6b7280"
                  value={scene.text}
                  onChangeText={(value) => updateScene(index, 'text', value)}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Test Connection Button */}
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={testConnection}
          >
            <Text style={styles.secondaryButtonText}>🔧 Test Connection</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.outlineButton} 
            onPress={resetForm}
            disabled={isProcessing}
          >
            <Text style={styles.outlineButtonText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.primaryButtonContainer, isProcessing && styles.disabledButton]} 
            onPress={processVideo}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={['#3b82f6', '#8b5cf6', '#06b6d4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {isProcessing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.primaryButtonText}>Processing...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>🚀 Create Trailer</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Create amazing video trailers from YouTube videos with custom scenes and text overlays
          </Text>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  
  // Full scrollable content
  fullContent: {
    flex: 1,
  },
  
  // Compact Hero Section
  compactHeroSection: {
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  heroContent: {
    alignItems: 'center',
    maxWidth: screenWidth - 40,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: -6,
    letterSpacing: -1,
  },
  heroDescription: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
    maxWidth: screenWidth - 80,
  },
  
  // Content Container
  contentContainer: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 30,
    minHeight: screenWidth * 1.5, // Ensure enough content height
  },
  
  // Modern Cards
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 20,
    lineHeight: 20,
  },
  
  // Modern Inputs
  modernInput: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  smallModernInput: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    width: 80,
    textAlign: 'center',
  },
  
  // Scene Cards
  modernSceneCard: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  sceneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modernSceneTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  sceneBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  sceneBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Time Inputs
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeInputContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  modernTimeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d1d5db',
    marginBottom: 8,
  },
  modernTimeInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#374151',
    textAlign: 'center',
  },
  unitLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  textInputContainer: {
    marginTop: 8,
  },
  
  // Modern Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 40,
    gap: 12,
  },
  
  // Secondary Button
  secondaryButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Outline Button
  outlineButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginRight: 6,
  },
  outlineButtonText: {
    color: '#d1d5db',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Primary Gradient Button
  primaryButtonContainer: {
    flex: 2,
    marginLeft: 6,
  },
  gradientButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Loading
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  // Disabled State
  disabledButton: {
    opacity: 0.5,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
